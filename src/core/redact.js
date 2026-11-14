// Redaction: turn a letter plus "things to hide" into a text with placeholders
// and a private map that never leaves the device.

import { findPatternHits } from './patterns.js';

const KIND_ALIASES = [
  [/national insurance|\bnino\b|\bni\b/i, 'NI_NUMBER'],
  [/\butr\b|tax(payer)? ref/i, 'TAX_REFERENCE'],
  [/post\s?code/i, 'POSTCODE'],
  [/address|street|town|city/i, 'ADDRESS'],
  [/e-?mail/i, 'EMAIL'],
  [/phone|mobile|tel/i, 'PHONE'],
  [/birth|dob/i, 'DATE_OF_BIRTH'],
  [/sort/i, 'SORT_CODE'],
  [/bank|account/i, 'BANK_ACCOUNT'],
  [/nhs/i, 'NHS_NUMBER'],
  [/name|person|recipient|tenant|claimant/i, 'NAME'],
  [/ref|number|id|code/i, 'REFERENCE'],
];

/** Map a free-text kind from the model ("National Insurance number") to a placeholder family. */
export function normaliseKind(kind) {
  const k = String(kind || '').trim();
  if (/^[A-Z][A-Z_]*$/.test(k)) return k;
  for (const [re, out] of KIND_ALIASES) if (re.test(k)) return out;
  return 'DETAIL';
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Find every place a value appears in the text. The model may return a value
 * with different spacing, line breaks or commas than the letter has (an
 * address over three lines comes back on one), so tokens are matched with
 * flexible separators and letters case-insensitively.
 */
export function locate(text, value) {
  const tokens = String(value || '').match(/[\p{L}\p{N}@.'’&+\/#-]+/gu);
  if (!tokens) return [];
  const cleaned = tokens.map((t) => t.replace(/^[.'’-]+|[.,'’-]+$/g, '')).filter(Boolean);
  if (!cleaned.length) return [];
  const body = cleaned.map(escapeRe).join('[\\s,.;:]*');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu');
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === '') {
      re.lastIndex++;
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

const TITLE_RE = /^(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof)\b\.?\s*/i;
// Words that can appear in a name-like string but must never be hidden alone.
const NAME_STOP = new Set(['the', 'and', 'of', 'for', 'sir', 'madam', 'occupier', 'customer', 'resident', 'tenant', 'taxpayer']);

/**
 * A name appears in several forms in one letter: "Mr Alan Example" in the
 * address block, "Dear Mr Example" in the greeting. Derive the other forms.
 */
export function nameVariants(name) {
  const full = String(name || '').trim().replace(/\s+/g, ' ');
  const bare = full.replace(TITLE_RE, '');
  const parts = bare.split(' ').filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 3 && !NAME_STOP.has(p.toLowerCase()));
  const out = new Set([full]);
  if (bare && bare !== full) out.add(bare);
  for (const p of parts) out.add(p);
  return [...out].filter((v) => v.replace(/[^\p{L}]/gu, '').length >= 3);
}

function canonical(s) {
  return s.replace(/[\s,.;:]+/g, ' ').trim().toLowerCase();
}

/**
 * @param {string} text the letter
 * @param {{kind:string,text:string,source?:string}[]} [details] details found
 *   by the on-device model or typed by the user
 * @returns {{
 *   redacted: string,
 *   map: Record<string,string>,
 *   entities: {placeholder:string,kind:string,text:string,sources:string[],count:number}[],
 *   unlocated: {kind:string,text:string,source:string}[]
 * }}
 */
export function redact(text, details = []) {
  const spans = [];
  const unlocated = [];

  for (const h of findPatternHits(text)) spans.push({ ...h, rank: 1 });

  for (const d of details) {
    const value = String(d?.text || '').trim();
    if (value.replace(/[^\p{L}\p{N}]/gu, '').length < 2) continue;
    const kind = normaliseKind(d.kind);
    const source = d.source || 'model';
    const values = kind === 'NAME' ? nameVariants(value) : [value];
    let found = 0;
    values.forEach((v, i) => {
      // Derived name parts are matched case-sensitively as written, so that
      // "Mark" does not hide the word "mark".
      const hits = locate(text, v).filter((h) => i === 0 || kind !== 'NAME' || /^\p{Lu}/u.test(h.text));
      for (const h of hits) spans.push({ kind, ...h, source, rank: 0 });
      found += hits.length;
    });
    if (!found) unlocated.push({ kind, text: value, source });
  }

  // Names found by the title pattern get the same variant treatment.
  for (const h of spans.filter((s) => s.kind === 'NAME' && s.source === 'pattern')) {
    for (const v of nameVariants(h.text).slice(1)) {
      for (const hit of locate(text, v)) {
        if (/^\p{Lu}/u.test(hit.text)) spans.push({ kind: 'NAME', ...hit, source: 'pattern', rank: 1 });
      }
    }
  }

  // Resolve overlaps: longest span wins, then model/user over pattern, then rule order.
  spans.sort((a, b) => b.end - b.start - (a.end - a.start) || a.rank - b.rank || (a.order ?? 0) - (b.order ?? 0) || a.start - b.start);
  const taken = [];
  for (const s of spans) {
    const clash = taken.find((t) => s.start < t.end && t.start < s.end);
    if (!clash) {
      taken.push({ ...s, sources: new Set([s.source]) });
    } else if (clash.start <= s.start && clash.end >= s.end) {
      clash.sources.add(s.source);
    } else {
      // Partial overlap: grow the kept span so nothing of either value is left visible.
      clash.start = Math.min(clash.start, s.start);
      clash.end = Math.max(clash.end, s.end);
      clash.text = text.slice(clash.start, clash.end);
      clash.sources.add(s.source);
    }
  }
  // Growing can make kept spans touch each other: merge those.
  taken.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const s of taken) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      last.end = Math.max(last.end, s.end);
      last.text = text.slice(last.start, last.end);
      for (const x of s.sources) last.sources.add(x);
    } else merged.push(s);
  }

  // One placeholder per distinct value, numbered per kind in order of appearance.
  const byKey = new Map();
  const counters = {};
  const entities = [];
  let redacted = '';
  let pos = 0;
  for (const s of merged) {
    const key = s.kind + '|' + canonical(s.text);
    let e = byKey.get(key);
    if (!e) {
      counters[s.kind] = (counters[s.kind] || 0) + 1;
      e = { placeholder: `[${s.kind}_${counters[s.kind]}]`, kind: s.kind, text: s.text, sources: new Set(), count: 0 };
      byKey.set(key, e);
      entities.push(e);
    }
    e.count++;
    for (const x of s.sources) e.sources.add(x);
    redacted += text.slice(pos, s.start) + e.placeholder;
    pos = s.end;
  }
  redacted += text.slice(pos);

  const map = {};
  for (const e of entities) {
    map[e.placeholder] = e.text;
    e.sources = [...e.sources].sort();
  }
  return { redacted, map, entities, unlocated };
}

/**
 * The gate. Before anything is sent, check that no hidden value is still
 * readable in the outgoing text. Values with digits are compared with all
 * spacing and punctuation removed; words are compared as whole words.
 * @returns {{placeholder:string,value:string}[]} leaks (empty means safe to send)
 */
export function findLeaks(outgoing, map) {
  const leaks = [];
  const squashed = outgoing.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  for (const [placeholder, value] of Object.entries(map)) {
    const core = value.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    if (core.length < 3) continue;
    const hasDigit = /\d/.test(core);
    const leaked = hasDigit && core.length >= 5 ? squashed.includes(core) : locate(outgoing, value).length > 0;
    if (leaked) leaks.push({ placeholder, value });
  }
  return leaks;
}

/** Placeholder families present in a text, for the legend sent with it (kinds only, never values). */
export function placeholderLegend(map) {
  return Object.keys(map);
}
