import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, findLeaks, locate, nameVariants, normaliseKind } from '../src/core/redact.js';
import { fillBack, fillBackDeep } from '../src/core/fillback.js';

test('one placeholder per distinct value, reused on repeats', () => {
  const r = redact('UTR 12345 67890. Quote 12345 67890 when you call. NI QQ 12 34 56 C.');
  assert.equal(r.redacted, 'UTR [TAX_REFERENCE_1]. Quote [TAX_REFERENCE_1] when you call. NI [NI_NUMBER_1].');
  assert.deepEqual(r.map, { '[TAX_REFERENCE_1]': '12345 67890', '[NI_NUMBER_1]': 'QQ 12 34 56 C' });
  assert.equal(r.entities[0].count, 2);
});

test('model details are found even when the letter spaces them differently', () => {
  const letter = 'Jordan Specimen\n6 Weaver Terrace,\nOld Mockton\nOM12 4JD\n\nYou owe £50.';
  const r = redact(letter, [
    { kind: 'name', text: 'Jordan Specimen' },
    { kind: 'address', text: '6 Weaver Terrace, Old Mockton' },
  ]);
  assert.ok(!r.redacted.includes('Specimen'));
  assert.ok(!r.redacted.includes('Mockton'));
  assert.ok(r.redacted.includes('£50'));
  assert.deepEqual(r.unlocated, []);
});

test('a detail the model made up is reported, not silently dropped', () => {
  const r = redact('You owe £50 by Friday.', [{ kind: 'NAME', text: 'Alan Example' }]);
  assert.equal(r.redacted, 'You owe £50 by Friday.');
  assert.deepEqual(r.unlocated, [{ kind: 'NAME', text: 'Alan Example', source: 'model' }]);
});

test('name variants: greeting form is hidden when only the full name was given', () => {
  assert.deepEqual(nameVariants('Mr Alan Example'), ['Mr Alan Example', 'Alan Example', 'Alan', 'Example']);
  const r = redact('To Alan Example.\nDear Mr Example,\nThank you, Alan.', [{ kind: 'NAME', text: 'Alan Example' }]);
  assert.ok(!/Alan|Example/.test(r.redacted), r.redacted);
});

test('a name part does not hide the same word in lower case', () => {
  const r = redact('Mark Sample must mark the form and sample the goods.', [{ kind: 'NAME', text: 'Mark Sample' }]);
  assert.equal(r.redacted, '[NAME_1] must mark the form and sample the goods.');
});

test('overlapping hits never leave part of a value visible', () => {
  const r = redact('Write to Flat 2, 48 Canal Street, Northbridge NB4 2QY.', [{ kind: 'ADDRESS', text: '48 Canal Street, Northbridge NB4 2QY' }]);
  assert.ok(!/Canal|Northbridge|NB4|Flat 2/.test(r.redacted), r.redacted);
});

test('sources are recorded: model, pattern, you', () => {
  const r = redact('NI QQ 12 34 56 C for Alan Example, codeword Bluebird.', [
    { kind: 'NI_NUMBER', text: 'QQ 12 34 56 C', source: 'model' },
    { kind: 'NAME', text: 'Alan Example', source: 'model' },
    { kind: 'DETAIL', text: 'Bluebird', source: 'you' },
  ]);
  const by = Object.fromEntries(r.entities.map((e) => [e.text, e.sources]));
  assert.deepEqual(by['QQ 12 34 56 C'], ['model', 'pattern']);
  assert.deepEqual(by['Alan Example'], ['model']);
  assert.deepEqual(by['Bluebird'], ['you']);
});

test('kind names from the model are normalised', () => {
  assert.equal(normaliseKind('National Insurance number'), 'NI_NUMBER');
  assert.equal(normaliseKind('full name'), 'NAME');
  assert.equal(normaliseKind('home address'), 'ADDRESS');
  assert.equal(normaliseKind('TAX_REFERENCE'), 'TAX_REFERENCE');
  assert.equal(normaliseKind('something odd'), 'DETAIL');
});

test('locate tolerates spacing and case, respects word edges', () => {
  assert.equal(locate('ref qq123456c ok', 'QQ123456C').length, 1);
  assert.equal(locate('balance', 'Alan').length, 0);
  assert.equal(locate('12 Sample\n  Road', '12 Sample Road').length, 1);
});

test('findLeaks: catches a value that survived, in any spacing', () => {
  const map = { '[NI_NUMBER_1]': 'QQ 12 34 56 C', '[NAME_1]': 'Alan Example' };
  assert.deepEqual(findLeaks('Dear [NAME_1], your number [NI_NUMBER_1].', map), []);
  assert.equal(findLeaks('Your number is QQ123456C.', map)[0].placeholder, '[NI_NUMBER_1]');
  assert.equal(findLeaks('Dear alan  example,', map)[0].placeholder, '[NAME_1]');
  assert.deepEqual(findLeaks('The balance is an example.', { '[NAME_1]': 'Alan' }), []);
});

test('fill-back restores details and round-trips the letter', () => {
  const letter = 'Mr Alan Example\n12 Sample Road\nDundee\nDD1 9ZZ\nUTR 12345 67890\nDear Mr Example, pay £100.';
  const r = redact(letter);
  assert.equal(fillBack(r.redacted, r.map).text, letter);
});

test('fill-back accepts sloppy placeholders and reports unknown ones', () => {
  const map = { '[NAME_1]': 'Alan Example', '[TAX_REFERENCE_1]': '12345 67890' };
  const r = fillBack('From [name_1], ref {TAX_REFERENCE 1} and [ NAME_1 ]. Dated [DATE_1]. See note [1].', map);
  assert.equal(r.text, 'From Alan Example, ref 12345 67890 and Alan Example. Dated [DATE_1]. See note [1].');
  assert.deepEqual(r.unknown, ['[DATE_1]']);
  assert.deepEqual(r.used.sort(), ['[NAME_1]', '[TAX_REFERENCE_1]']);
});

test('fillBackDeep walks objects and arrays', () => {
  const r = fillBackDeep({ a: 'Hi [NAME_1]', b: ['x [NAME_1]', { c: '[REFERENCE_9]' }], n: 3 }, { '[NAME_1]': 'Alan' });
  assert.deepEqual(r.value, { a: 'Hi Alan', b: ['x Alan', { c: '[REFERENCE_9]' }], n: 3 });
  assert.deepEqual(r.unknown, ['[REFERENCE_9]']);
});

// ---------- the redaction and the gate must agree ----------

import { readFileSync as _read } from 'node:fs';
import { LETTERS as _LETTERS } from '../eval/letters.js';
import { findLeaks as _findLeaks, redact as _redact } from '../src/core/redact.js';

test('a town hidden in the address block is hidden everywhere, so the gate does not block the send', () => {
  const letter = _LETTERS.find((l) => l.id === 'energy-debt');
  // what the on-device model returned on 16 Nov 2026: no "Glasgow"
  const details = [
    { kind: 'NAME', text: 'Miss Aroha Sampleson' },
    { kind: 'ADDRESS', text: '3/2, 91 Tollcross Road' },
    { kind: 'POSTCODE', text: 'G32 8ZZ' },
  ];
  const r = _redact(letter.text, details);
  assert.deepEqual(_findLeaks(r.redacted, r.map), []);
  assert.ok(!r.redacted.includes('Glasgow'));
  for (const k of letter.keep) assert.ok(r.redacted.includes(k), `${k} was hidden by mistake`);
});

test('every sample letter passes the gate, with patterns alone and with the recorded on-device output', () => {
  const nano = JSON.parse(_read(new URL('../eval/nano-output.json', import.meta.url), 'utf8'));
  for (const l of _LETTERS) {
    for (const details of [[], nano.letters[l.id].output.personal_details || []]) {
      const r = _redact(l.text, details);
      assert.deepEqual(_findLeaks(r.redacted, r.map), [], `${l.id}: the gate would block`);
    }
  }
});

test('an NHS number the model labels as an NI number keeps the NHS label (the model has no NHS kind)', () => {
  const r = redact('NHS number: 943 476 5919\nPCN reference: AB1234', [
    { kind: 'NI_NUMBER', text: '943 476 5919', source: 'model' },
  ]);
  assert.match(r.redacted, /NHS number: \[NHS_NUMBER_1\]/);
  assert.equal(r.map['[NHS_NUMBER_1]'], '943 476 5919');
  const e = r.entities.find((x) => x.text === '943 476 5919');
  assert.deepEqual(e.sources, ['model', 'pattern']);
});
