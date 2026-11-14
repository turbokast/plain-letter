// Scoring used by the evaluation and by the tests: was each labelled detail
// hidden, and did the facts the cloud needs stay readable?

import { redact, locate } from '../src/core/redact.js';

const squash = (s) => s.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

/** True if the value can still be read in the text. */
export function visible(text, value) {
  if (/\d/.test(value) && squash(value).length >= 5) return squash(text).includes(squash(value));
  return locate(text, value).length > 0;
}

/**
 * @param {{text:string,pii:{kind:string,text:string}[],keep:string[]}} letter
 * @param {{kind:string,text:string}[]} modelDetails what the on-device model returned ([] = patterns only)
 */
export function scoreLetter(letter, modelDetails = []) {
  const r = redact(letter.text, modelDetails.map((d) => ({ ...d, source: 'model' })));
  const missed = letter.pii.filter((p) => visible(r.redacted, p.text));
  const lost = letter.keep.filter((k) => !r.redacted.includes(k));
  return { id: letter.id, total: letter.pii.length, hidden: letter.pii.length - missed.length, missed, keepTotal: letter.keep.length, kept: letter.keep.length - lost.length, lost, redaction: r };
}

export function summarise(scores) {
  const sum = (f) => scores.reduce((a, s) => a + f(s), 0);
  const byKind = {};
  for (const s of scores) {
    const letter = s.letter;
    for (const p of letter.pii) {
      const k = (byKind[p.kind] ||= { total: 0, hidden: 0 });
      k.total++;
      if (!s.missed.includes(p)) k.hidden++;
    }
  }
  return {
    letters: scores.length,
    pii: sum((s) => s.total),
    hidden: sum((s) => s.hidden),
    keep: sum((s) => s.keepTotal),
    kept: sum((s) => s.kept),
    lettersFullyHidden: scores.filter((s) => s.missed.length === 0).length,
    byKind,
  };
}
