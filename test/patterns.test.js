import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPatternHits, luhn, nhsCheck } from '../src/core/patterns.js';

const kinds = (text) => findPatternHits(text).map((h) => `${h.kind}:${h.text}`);
const has = (text, kind, value) => assert.ok(kinds(text).includes(`${kind}:${value}`), `${kind} "${value}" not found in: ${kinds(text).join(' | ')}`);
const hasNot = (text, kind) => assert.ok(!kinds(text).some((k) => k.startsWith(kind + ':')), `unexpected ${kind} in: ${kinds(text).join(' | ')}`);

test('National Insurance number, spaced and unspaced', () => {
  has('NI number QQ 12 34 56 C.', 'NI_NUMBER', 'QQ 12 34 56 C');
  has('NINO: QQ123456C', 'NI_NUMBER', 'QQ123456C');
  hasNot('Order AB 12 34 56 X', 'NI_NUMBER');
});

test('UTR with and without the space', () => {
  has('UTR 12345 67890', 'TAX_REFERENCE', '12345 67890');
  has('UTR: 1234567890K', 'TAX_REFERENCE', '1234567890K');
});

test('postcodes', () => {
  for (const pc of ['DD1 9ZZ', 'G32 8ZZ', 'SW1A 1AA', 'M1 1AE', 'OM12 4JD']) has(`Dundee ${pc}`, 'POSTCODE', pc);
  hasNot('Code 1057L applies', 'POSTCODE');
});

test('phone numbers and emails', () => {
  has('Call 01632 960123 today', 'PHONE', '01632 960123');
  has('Mobile 07700 900123', 'PHONE', '07700 900123');
  has('or +44 7700 900123', 'PHONE', '+44 7700 900123');
  has('Email a.b@example.com now', 'EMAIL', 'a.b@example.com');
});

test('bank details need their words', () => {
  has('Sort code 40-51-62  Account number 31926819', 'SORT_CODE', '40-51-62');
  has('Sort code 40-51-62  Account number 31926819', 'BANK_ACCOUNT', '31926819');
  hasNot('Paid on 12-11-26 as agreed', 'SORT_CODE');
});

test('dates stay unless they are a date of birth', () => {
  hasNot('You must pay by 14 December 2026.', 'DATE_OF_BIRTH');
  has('Date of birth: 14/03/1984', 'DATE_OF_BIRTH', '14/03/1984');
  has('Date of birth: 2 May 1991', 'DATE_OF_BIRTH', '2 May 1991');
  assert.deepEqual(kinds('You must pay £100 by 14 December 2026 or within 30 days.'), []);
});

test('references introduced by a word', () => {
  has('Tenancy reference: HL/2023/00417', 'REFERENCE', 'HL/2023/00417');
  has('Our reference: UC-88204417-OP', 'REFERENCE', 'UC-88204417-OP');
  has('Customer number 5500 1234 77', 'REFERENCE', '5500 1234 77');
  hasNot('Penalty notice dated 14/12/2026', 'REFERENCE');
});

test('titled names and street lines', () => {
  has('Dear Mr Example\n', 'NAME', 'Mr Example');
  has('Mrs Grace Testerton\n9 Orchard Close', 'NAME', 'Mrs Grace Testerton');
  has('Mrs Grace Testerton\n9 Orchard Close', 'ADDRESS', '9 Orchard Close');
  has('Mr K Placeholder-Jones', 'NAME', 'Mr K Placeholder-Jones');
});

test('address block: lines between a name and a postcode are hidden', () => {
  const t = 'Mx Robin Dummyson\nThe Old Bakery\n4 Chapel Lane\nNether Sample\nNS6 1PL\n\nDear Mx Dummyson';
  has(t, 'ADDRESS', 'The Old Bakery');
  has(t, 'ADDRESS', 'Nether Sample');
});

test('sender block without a name or street above the postcode is left alone', () => {
  hasNot('HM Revenue and Customs\nSelf Assessment\nBX9 1AS', 'ADDRESS');
});

test('check digits', () => {
  assert.equal(luhn('4242424242424242'), true);
  assert.equal(luhn('4242424242424241'), false);
  assert.equal(nhsCheck('9434765919'), true);
  assert.equal(nhsCheck('9434765918'), false);
});

test('address on one line: town between the street and the postcode is hidden', () => {
  const t = 'Defendant: Jordan Specimen, 6 Weaver Terrace, Old Mockton, OM12 4JD';
  has(t, 'ADDRESS', '6 Weaver Terrace');
  has(t, 'ADDRESS', 'Old Mockton');
  has(t, 'POSTCODE', 'OM12 4JD');
});
