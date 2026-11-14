// Stand-ins for the model calls. Used by the offline tests, and by the app as
// the cloud step while no Firebase project is configured (the screen then says
// "demo answer" on everything this produces). Nothing here calls a network.

/**
 * @param {object} [o]
 * @param {(letter:string)=>object} [o.extract] scripted on-device answer; omit for "no on-device model"
 * @param {string} [o.source] what explain reports as its source
 */
export function createMockAI({ extract = null, source = 'demo' } = {}) {
  const calls = [];
  return {
    name: 'mock',
    hasCloud: false,
    calls,
    async onDeviceStatus() {
      return extract ? 'available' : 'unavailable';
    },
    async prepare() {
      return extract ? 'available' : 'unavailable';
    },
    async extract(letter) {
      calls.push({ fn: 'extract', input: letter });
      if (!extract) throw new Error('No on-device model in this browser.');
      return extract(letter);
    },
    async explain(redacted, { neverSend = false, placeholders = [] } = {}) {
      calls.push({ fn: 'explain', input: redacted, neverSend });
      const name = placeholders.find((p) => p.startsWith('[NAME_')) || '';
      const refs = placeholders.filter((p) => /REFERENCE|NI_NUMBER/.test(p));
      return {
        source: neverSend ? 'on-device' : source,
        result: {
          summary: 'Demo answer: no cloud model is connected in this build, so this text is a fixed example and does not describe your letter.',
          what_it_means: [
            'With a Firebase project connected, this is where the plain-English explanation appears.',
            `The text that would have been sent is ${redacted.length} characters long and contains ${placeholders.length} placeholder(s) instead of your details.`,
          ],
          if_ignored: 'Demo answer: not worked out.',
          options: [{ title: 'Connect the cloud step', detail: 'Add the Firebase web config to .env.local and reload.' }],
          reply_draft: [
            'Dear Sir or Madam,',
            '',
            refs.length ? `Your reference: ${refs.join(', ')}` : 'Your reference: (none found)',
            '',
            'I am writing about your recent letter. (Demo reply: the real draft is written by the cloud model from the redacted text.)',
            '',
            'Yours faithfully,',
            name,
          ].join('\n'),
          check_first: ['This is a demo answer.'],
        },
      };
    },
    async rewrite(redactedReply, instruction) {
      calls.push({ fn: 'rewrite', input: redactedReply, instruction });
      return { text: redactedReply, source };
    },
  };
}
