// UK reference-format pattern check. This is the deterministic safety net under
// the on-device model: it does not depend on any model being present or right.
// Recall matters more than precision here: a value hidden by mistake is put
// back locally at the end, a value missed is sent to the cloud.

const STREET =
  'Road|Street|Avenue|Lane|Drive|Close|Way|Crescent|Place|Terrace|Gardens|Court|Park|Square|Grove|Row|Walk|Hill|View|Wynd|Mews|Rd|St|Ave';

// A date such as 14/12/2026, 14 December 2026 or 14 Dec 26.
export const DATE_SRC =
  '\\d{1,2}(?:st|nd|rd|th)?(?:[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}|\\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{2,4})';

/**
 * Each rule: kind (placeholder family), re (global regex), group (capture group
 * holding the value, default 0), check (optional extra test on the value).
 * Earlier rules win when two hits cover the same characters with equal length.
 */
export const RULES = [
  { kind: 'EMAIL', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  {
    // UK phone numbers: +44 or leading 0, 10 or 11 digits in total.
    kind: 'PHONE',
    re: /(?<![\d\/-])(?:\+44[\s-]?\(?0?\)?[\s-]?|\(?0)\d(?:[\s()-]?\d){8,9}(?![\d\/-])/g,
    check: (v) => {
      const d = v.replace(/\D/g, '').replace(/^44/, '0');
      return d.length === 10 || d.length === 11;
    },
  },
  {
    // National Insurance number: two letters, six digits, suffix A to D.
    kind: 'NI_NUMBER',
    re: /\b[A-Z]{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?[A-D]\b/g,
  },
  {
    // Date of birth, only when the words say so (other dates stay: the cloud
    // needs the deadline to explain the letter).
    kind: 'DATE_OF_BIRTH',
    re: new RegExp(`(?:date of birth|d\\.?o\\.?b\\.?|born(?: on)?)\\s*[:\\-]?\\s*(${DATE_SRC})`, 'gi'),
    group: 1,
  },
  {
    kind: 'SORT_CODE',
    re: /sort\s*code\s*(?:is|:|-)?\s*(\d{2}[\s-]?\d{2}[\s-]?\d{2})\b/gi,
    group: 1,
  },
  {
    kind: 'BANK_ACCOUNT',
    re: /account\s*(?:number|no\.?|num)?\s*(?:ending(?: in)?|is|:|-)?\s*(\d{8})\b/gi,
    group: 1,
  },
  {
    // Payment card: 16 digits passing the Luhn check.
    kind: 'CARD_NUMBER',
    re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    check: (v) => luhn(v.replace(/\D/g, '')),
  },
  {
    // NHS number: 3 3 4 digits with a mod-11 check digit.
    kind: 'NHS_NUMBER',
    re: /\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/g,
    check: (v) => nhsCheck(v.replace(/\D/g, '')),
  },
  {
    // Unique Taxpayer Reference (10 digits, often written 5 5, sometimes a K)
    // and any other free-standing 10-digit reference.
    kind: 'TAX_REFERENCE',
    re: /(?<![\d\/-])\d{5}\s?\d{5}K?(?![\d\/-])/g,
  },
  { kind: 'PAYE_REFERENCE', re: /\b\d{3}\/[A-Z]{1,3}\d{3,8}\b/g },
  { kind: 'DRIVING_LICENCE', re: /\b[A-Z9]{5}\d{6}[A-Z9]{2}\d[A-Z]{2}\b/g },
  {
    kind: 'POSTCODE',
    re: /\b(?:GIR\s?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2})\b/g,
  },
  { kind: 'VEHICLE_REG', re: /\b[A-Z]{2}\d{2}\s?[A-Z]{3}\b/g },
  {
    // Anything introduced as a reference or account number: council tax,
    // claims, cases, customers, tenancies, penalties.
    kind: 'REFERENCE',
    re: /\b(?:ref(?:erence)?|account|customer|claim|case|tenancy|penalty|pcn|notice|invoice|policy|payroll|application|membership|password|passcode|pin)\s*(?:id|number|no\.?|num|ref(?:erence)?|code)?\s*(?:is|:|-|#)?\s*((?=[A-Z0-9\/ -]*\d)[A-Z0-9](?:[A-Z0-9\/-]| (?=\d)){4,}[A-Z0-9])(?![A-Za-z])/gi,
    group: 1,
    check: (v) => (v.match(/\d/g) || []).length >= 3 && !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(v),
  },
  {
    // A title followed by capitalised words: "Mr Alan Example", "Dr A. Example".
    kind: 'NAME',
    re: /\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof)\b\.?[ \t]+(?:[A-Z](?:\.|[a-z'’]*)[ \t]+){0,2}[A-Z][a-z'’]+(?:-[A-Z][a-z'’]+)*/g,
  },
  {
    // A street line: "12 Sample Road", "Flat 2, 4B High Street".
    kind: 'ADDRESS',
    re: new RegExp(
      `\\b(?:(?:Flat|Apartment|Unit)\\s+\\d+[A-Za-z]?,?\\s+)?\\d{1,4}[A-Za-z]?(?:\\/\\d{1,3})?,?[ \\t]+(?:[A-Z][a-z'’]+[ \\t]+){1,3}(?:${STREET})\\b\\.?`,
      'g'
    ),
  },
];

export function luhn(digits) {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function nhsCheck(digits) {
  if (!/^\d{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (digits.charCodeAt(i) - 48) * (10 - i);
  let c = 11 - (sum % 11);
  if (c === 11) c = 0;
  return c !== 10 && c === digits.charCodeAt(9) - 48;
}

/**
 * Run every rule over the text.
 * @returns {{kind:string,start:number,end:number,text:string,source:'pattern'}[]}
 */
export function findPatternHits(text) {
  const hits = [];
  RULES.forEach((rule, order) => {
    const re = new RegExp(rule.re.source, rule.re.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[0] === '') {
        re.lastIndex++;
        continue;
      }
      const g = rule.group || 0;
      const value = m[g];
      if (!value) continue;
      const start = m.index + m[0].lastIndexOf(value);
      if (rule.check && !rule.check(value)) continue;
      hits.push({ kind: rule.kind, start, end: start + value.length, text: value, source: 'pattern', order });
    }
  });
  return hits.concat(addressBlockHits(text, hits));
}

/**
 * An address block is a name or street line, a few lines, then a postcode.
 * The lines in between (house name, village, town) match no pattern of their
 * own, so hide them as whole lines when they sit inside such a block.
 */
export function addressBlockHits(text, hits) {
  const lines = [];
  let pos = 0;
  for (const raw of text.split('\n')) {
    lines.push({ start: pos, end: pos + raw.length, raw });
    pos += raw.length + 1;
  }
  const lineOf = (i) => lines.findIndex((l) => i >= l.start && i <= l.end);
  const kindsOn = (n) => hits.filter((h) => lineOf(h.start) === n).map((h) => h.kind);
  const out = [];
  for (const pc of hits.filter((h) => h.kind === 'POSTCODE')) {
    const last = lineOf(pc.start);
    let top = -1;
    for (let n = last - 1; n >= Math.max(0, last - 5); n--) {
      if (!lines[n].raw.trim()) break;
      const kinds = kindsOn(n);
      if (kinds.includes('NAME') || kinds.includes('ADDRESS')) top = n;
    }
    if (top < 0) continue;
    for (let n = top; n <= last; n++) {
      const kinds = kindsOn(n);
      if (kinds.includes('NAME')) continue;
      const l = lines[n];
      // Keep the postcode as its own placeholder; hide the rest of the line.
      const end = n === last ? pc.start : l.end;
      const value = text.slice(l.start, end).replace(/[\s,]+$/, '');
      const lead = value.length - value.trimStart().length;
      if (value.trim().length < 2) continue;
      out.push({ kind: 'ADDRESS', start: l.start + lead, end: l.start + value.length, text: value.trimStart(), source: 'pattern', order: 99 });
    }
  }
  return out;
}
