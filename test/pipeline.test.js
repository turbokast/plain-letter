import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, LeakError } from '../src/core/pipeline.js';
import { createMockAI } from '../src/ai/mock.js';
import { LETTERS, byId } from '../eval/letters.js';
import { scoreLetter, summarise, visible } from '../eval/score.js';
import { parseUkDate, daysUntil, deadlineLabel } from '../src/core/dates.js';

const hmrc = byId('hmrc-late-filing');
const nanoLike = () => ({
  letter_type: 'late filing penalty',
  sender: 'HM Revenue and Customs',
  amount: '£100',
  deadline: '14 December 2026',
  personal_details: [
    { kind: 'NAME', text: 'Mr Alan Example' },
    { kind: 'ADDRESS', text: '12 Sample Road, Dundee' },
    { kind: 'POSTCODE', text: 'DD1 9ZZ' },
  ],
});

test('the cloud step receives the redacted text and nothing else', async () => {
  const ai = createMockAI({ extract: nanoLike, source: 'cloud' });
  const s = createSession(ai);
  await s.analyse(hmrc.text);
  await s.explain();
  const sent = ai.calls.find((c) => c.fn === 'explain').input;
  for (const p of hmrc.pii) assert.ok(!visible(sent, p.text), `${p.text} was sent`);
  for (const k of hmrc.keep) assert.ok(sent.includes(k), `${k} missing from what was sent`);
  assert.equal(s.outbound.length, 1);
  assert.equal(s.outbound[0].payload, sent);
  assert.equal(s.outbound[0].where, 'cloud');
});

test('the full letter only ever goes to the on-device call', async () => {
  const ai = createMockAI({ extract: nanoLike, source: 'cloud' });
  const s = createSession(ai);
  await s.analyse(hmrc.text);
  await s.explain();
  await s.rewrite('shorter');
  for (const c of ai.calls) {
    if (c.fn === 'extract') assert.equal(c.input, hmrc.text);
    else assert.ok(!c.input.includes('Example') && !c.input.includes('12345'), `${c.fn} saw personal details`);
  }
});

test('the reply comes back with the real details filled in locally', async () => {
  const s = createSession(createMockAI({ extract: nanoLike, source: 'cloud' }));
  await s.analyse(hmrc.text);
  const e = await s.explain();
  assert.match(e.redacted.reply_draft, /\[NAME_1\]/);
  assert.match(e.filled.reply_draft, /Mr Alan Example/);
  assert.doesNotMatch(e.filled.reply_draft, /\[NAME_1\]/);
});

test('"stay on this device" logs nothing as sent', async () => {
  const ai = createMockAI({ extract: nanoLike });
  const s = createSession(ai);
  await s.analyse(hmrc.text);
  const e = await s.explain({ neverSend: true });
  assert.equal(e.source, 'on-device');
  assert.equal(s.outbound.length, 0);
  assert.equal(ai.calls.find((c) => c.fn === 'explain').neverSend, true);
});

test('no on-device model: patterns still redact, and the level says so', async () => {
  const s = createSession(createMockAI());
  const st = await s.analyse(hmrc.text);
  assert.equal(st.level, 'patterns-only');
  assert.match(st.modelError, /No on-device model/);
  assert.equal(st.facts, null);
  assert.ok(!st.redaction.redacted.includes('12345 67890'));
});

test('the gate blocks sending when a hidden value is still readable', async () => {
  const ai = createMockAI({ extract: nanoLike, source: 'cloud' });
  const s = createSession(ai);
  await s.analyse(hmrc.text);
  // Simulate a redaction bug: the map says the UTR is hidden, the text still has it.
  s.state.redaction.redacted += '\nUTR 1234567890';
  await assert.rejects(() => s.explain(), LeakError);
  assert.equal(ai.calls.filter((c) => c.fn === 'explain').length, 0);
  assert.equal(s.outbound.length, 0);
});

test('a term the user adds is hidden everywhere and clears the old answer', async () => {
  const s = createSession(createMockAI({ extract: nanoLike, source: 'cloud' }));
  await s.analyse(hmrc.text);
  await s.explain();
  const st = s.addTerm('Self Assessment');
  assert.ok(!st.redaction.redacted.includes('Self Assessment'));
  assert.equal(st.explanation, null);
  assert.ok(st.redaction.entities.some((e) => e.sources.includes('you')));
});

test('made-up details from the model surface as unlocated', async () => {
  const s = createSession(createMockAI({ extract: () => ({ ...nanoLike(), personal_details: [{ kind: 'NAME', text: 'Someone Else' }] }) }));
  const st = await s.analyse(hmrc.text);
  assert.equal(st.redaction.unlocated[0].text, 'Someone Else');
});

test('evaluation floor: patterns alone never hide a needed fact, and hide at least 85% of labelled details', () => {
  const scores = LETTERS.map((l) => ({ ...scoreLetter(l), letter: l }));
  const sum = summarise(scores);
  assert.equal(sum.kept, sum.keep);
  assert.ok(sum.hidden / sum.pii >= 0.85, `${sum.hidden}/${sum.pii}`);
});

test('every sample letter round-trips through redact and fill-back', async () => {
  for (const l of LETTERS) {
    const s = createSession(createMockAI());
    const st = await s.analyse(l.text);
    const { fillBack } = await import('../src/core/fillback.js');
    assert.equal(fillBack(st.redaction.redacted, st.redaction.map).text, l.text, l.id);
  }
});

test('UK dates and days left', () => {
  assert.equal(parseUkDate('14 December 2026').toISOString().slice(0, 10), '2026-12-14');
  assert.equal(parseUkDate('14/12/2026').toISOString().slice(0, 10), '2026-12-14');
  assert.equal(parseUkDate('by 1st Feb 27').toISOString().slice(0, 10), '2027-02-01');
  assert.equal(parseUkDate('31/02/2026'), null);
  assert.equal(parseUkDate('soon'), null);
  const today = new Date(2026, 10, 14);
  assert.equal(daysUntil('14 December 2026', today), 30);
  assert.equal(deadlineLabel('14 December 2026', today), '30 days left');
  assert.equal(deadlineLabel('13 November 2026', today), '1 day ago');
});
