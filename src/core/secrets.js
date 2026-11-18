// Passwords, PINs and access codes belong in an online form, never in a letter
// back to the sender. The redacted letter tells us which placeholders stand for
// one (the word before it); the reply draft is cleaned of them on the device,
// after every cloud or on-device step, whatever the model did.

const SECRET_WORDS = '(?:password|passcode|pass code|PIN(?: number)?|security code|access code|activation code|one[- ]time code)';

/** Placeholders the letter introduces as a password, PIN or access code. */
export function secretPlaceholders(redactedLetter) {
  const out = new Set();
  const re = new RegExp(`\\b${SECRET_WORDS}\\b[^\\[\\n.]{0,24}(\\[[A-Z_]+_\\d+\\])`, 'gi');
  for (const m of String(redactedLetter ?? '').matchAll(re)) out.add(m[1]);
  return out;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Remove secret placeholders (and the label in front of them) from a reply.
 * @returns {{text:string, removed:boolean}}
 */
export function stripSecrets(text, secrets) {
  let t = String(text ?? '');
  const before = t;
  for (const ph of secrets) {
    const p = esc(ph);
    // ", Password [REFERENCE_2]" / " and the password is [X]" / "(PIN: [X])"
    t = t.replace(new RegExp(`\\s*[,;]?\\s*(?:and\\s+)?(?:(?:my|the|your)\\s+)?${SECRET_WORDS}\\s*(?:is|:|-)?\\s*\\(?${p}\\)?`, 'gi'), '');
    t = t.replace(new RegExp(`\\s*\\(?${p}\\)?`, 'g'), '');
  }
  if (t !== before) t = t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').replace(/([.,;])\1+/g, '$1');
  return { text: t, removed: t !== before };
}
