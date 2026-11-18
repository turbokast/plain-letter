// The pipeline: which step runs where, and the gate between them.
// Pure logic. The `ai` object is injected (Firebase AI Logic in the app, a
// mock in tests), so every rule here is tested offline.
//
//   ai.extract(letter)            on the device only, sees the full letter
//   ai.explain(redacted, opts)    cloud (or on-device when asked), sees the redacted letter only
//   ai.rewrite(redacted, how)     on-device preferred, sees the redacted reply only
//   ai.transcribe(image)          on the device only, sees the photo; optional

import { redact, findLeaks, locate } from './redact.js';
import { fillBack, fillBackDeep } from './fillback.js';
import { secretPlaceholders, stripSecrets } from './secrets.js';
import { REWRITE_INSTRUCTIONS } from './prompts.js';

export class LeakError extends Error {
  constructor(leaks) {
    super(`Blocked: ${leaks.length} hidden detail(s) still readable in the text to send.`);
    this.name = 'LeakError';
    this.leaks = leaks;
  }
}

/**
 * The on-device model sometimes works a date out ("issued 3 November, 14 days
 * to respond" becomes "17 November") or simply gets one wrong. A fact is shown
 * only if its words are in the letter; anything else is dropped and counted.
 */
export function checkFacts(letter, facts) {
  if (!facts) return null;
  const out = { letter_type: String(facts.letter_type || ''), sender: String(facts.sender || ''), amount: '', deadline: '', dropped: [] };
  for (const key of ['amount', 'deadline']) {
    const v = String(facts[key] || '').trim();
    if (!v) continue;
    const inLetter = locate(letter, v).length > 0 || (key === 'amount' && /\d/.test(v) && locate(letter, '£' + v.replace(/^£/, '')).length > 0);
    if (inLetter) out[key] = key === 'amount' && !/^[£$€]/.test(v) && /^\d/.test(v) ? '£' + v : v;
    else out.dropped.push({ key, value: v });
  }
  return out;
}

/** Tidy what the on-device model returns for a photo: no code fences, no "Here is the text" line, no trailing spaces. */
export function cleanTranscript(text) {
  let t = String(text || '').replace(/\r\n?/g, '\n');
  t = t.replace(/^\s*```[a-z]*\n/i, '').replace(/\n```\s*$/, '');
  t = t.replace(/^\s*(?:here is|here's|sure)[^\n]{0,80}:\s*\n+/i, '');
  return t
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createSession(ai, { now = () => new Date() } = {}) {
  /** Everything that was handed to a cloud-capable call, exactly as sent. */
  const outbound = [];
  let state = null;

  function record(purpose, payload, where) {
    outbound.push({ at: now().toISOString(), purpose, where, chars: payload.length, payload });
  }

  /** Called immediately before anything is handed to a call that may leave the device. */
  function gate(payload) {
    const leaks = findLeaks(payload, state.redaction.map);
    if (leaks.length) throw new LeakError(leaks);
  }

  return {
    outbound,
    get state() {
      return state;
    },

    /**
     * Before step 1, optional: read a photo of the letter into text on the
     * device. The image goes to the on-device call only; there is no cloud
     * path for it, so with no on-device model this refuses instead.
     */
    async readPhoto(image) {
      if (typeof ai.transcribe !== 'function') throw new Error('Reading a photo needs the on-device model.');
      const { text, source } = await ai.transcribe(image);
      if (source !== 'on-device') throw new Error('The photo was not read on this device, so the result was thrown away.');
      const letter = cleanTranscript(text);
      if (!letter) throw new Error('No text could be read from the photo.');
      return letter;
    },

    /**
     * Step 1, on the device: find personal details with the on-device model
     * (when there is one) and the pattern check (always), and build the
     * redacted text. Nothing is sent anywhere.
     */
    async analyse(letter, { extraTerms = [] } = {}) {
      let facts = null;
      let modelError = null;
      let modelDetails = [];
      try {
        facts = await ai.extract(letter);
        modelDetails = (facts?.personal_details || []).map((d) => ({ ...d, source: 'model' }));
      } catch (e) {
        modelError = e;
      }
      const user = extraTerms.map((t) => ({ kind: 'DETAIL', text: t, source: 'you' }));
      const redaction = redact(letter, [...modelDetails, ...user]);
      state = {
        letter,
        extraTerms: [...extraTerms],
        modelDetails,
        facts: checkFacts(letter, facts),
        redaction,
        // 'model+patterns' when the on-device model ran, 'patterns-only' when it could not.
        level: facts ? 'model+patterns' : 'patterns-only',
        modelError: modelError ? String(modelError.message || modelError) : null,
        explanation: null,
      };
      return state;
    },

    /** The user points at something the model and the patterns missed. No model call. */
    addTerm(term) {
      if (!state) throw new Error('Nothing analysed yet.');
      const t = String(term || '').trim();
      if (!t) return state;
      state.extraTerms.push(t);
      const user = state.extraTerms.map((x) => ({ kind: 'DETAIL', text: x, source: 'you' }));
      state.redaction = redact(state.letter, [...state.modelDetails, ...user]);
      state.explanation = null;
      return state;
    },

    /**
     * Step 2: explanation and reply draft from the redacted text.
     * neverSend=true keeps it on the device (shorter, basic answer).
     * Step 3 happens here too: the details are filled back in locally.
     */
    async explain({ neverSend = false } = {}) {
      if (!state) throw new Error('Nothing analysed yet.');
      const payload = state.redaction.redacted;
      gate(payload);
      if (!neverSend) record('explain', payload, 'cloud');
      const { result, source } = await ai.explain(payload, { neverSend, placeholders: Object.keys(state.redaction.map) });
      if (!neverSend && source !== 'cloud') outbound[outbound.length - 1].where = source;
      // A reply must never carry a password, PIN or access code from the letter.
      const secrets = secretPlaceholders(payload);
      const cleaned = stripSecrets(result.reply_draft, secrets);
      const safe = cleaned.removed ? { ...result, reply_draft: cleaned.text } : result;
      const filled = fillBackDeep(safe, state.redaction.map);
      state.explanation = { redacted: safe, filled: filled.value, unknownPlaceholders: filled.unknown, source, secretRemoved: cleaned.removed };
      return state.explanation;
    },

    /** Adjust the reply draft. Works on the placeholder version, so it is safe wherever it runs. */
    async rewrite(how) {
      if (!state?.explanation) throw new Error('No reply draft yet.');
      const instruction = REWRITE_INSTRUCTIONS[how];
      if (!instruction) throw new Error(`Unknown rewrite: ${how}`);
      const payload = state.explanation.redacted.reply_draft;
      gate(payload);
      const raw = await ai.rewrite(payload, instruction);
      const source = raw.source;
      const text = stripSecrets(raw.text, secretPlaceholders(state.redaction.redacted)).text;
      if (source === 'cloud') record('rewrite reply', payload, 'cloud');
      const filled = fillBack(text, state.redaction.map);
      state.explanation.redacted = { ...state.explanation.redacted, reply_draft: text };
      state.explanation.filled = { ...state.explanation.filled, reply_draft: filled.text };
      state.explanation.unknownPlaceholders = [...new Set([...state.explanation.unknownPlaceholders, ...filled.unknown])];
      return { text: filled.text, source };
    },
  };
}
