import test from 'node:test';
import assert from 'node:assert/strict';
import { secretPlaceholders, stripSecrets } from '../src/core/secrets.js';

test('finds placeholders introduced as a password or PIN', () => {
  const s = secretPlaceholders('Use the claim number [REFERENCE_1] and the password [REFERENCE_2]. Your PIN: [OTHER_1]. Ref [REFERENCE_3].');
  assert.deepEqual([...s].sort(), ['[OTHER_1]', '[REFERENCE_2]']);
});

test('removes the password from a reply and keeps the claim number', () => {
  const secrets = new Set(['[REFERENCE_2]']);
  const r = stripSecrets('Re: Claim Number [REFERENCE_1], Password [REFERENCE_2]. I am writing about the claim.', secrets);
  assert.equal(r.text, 'Re: Claim Number [REFERENCE_1]. I am writing about the claim.');
  assert.equal(r.removed, true);
});

test('removes a bare secret placeholder and leaves other text alone', () => {
  const r = stripSecrets('My details: [REFERENCE_2] and [NAME_1].', new Set(['[REFERENCE_2]']));
  assert.ok(!r.text.includes('[REFERENCE_2]'));
  assert.ok(r.text.includes('[NAME_1]'));
  assert.equal(stripSecrets('Nothing secret here.', new Set(['[X_1]'])).removed, false);
});
