// Regression test for the fault found on 16 Nov 2026: with no `LanguageModel`
// in the browser, firebase 13.3.0 sends ONLY_ON_DEVICE calls to the cloud.
// Node has no LanguageModel either, so the real provider is loaded here with
// the real SDK and a recording fetch: every device-only step must refuse
// without a single network request.

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('with no on-device model, the device-only steps refuse and make no network request', async () => {
  assert.equal(typeof globalThis.LanguageModel, 'undefined');
  const realFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url?.url || url), body: String(init?.body || '') });
    return new Response(JSON.stringify({ error: { code: 400, message: 'test: no network' } }), { status: 400, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { createFirebaseAI, NoOnDeviceModelError } = await import('../src/ai/firebase.js');
    const { createMockAI } = await import('../src/ai/mock.js');
    const ai = createFirebaseAI({ config: null, cloudStandIn: createMockAI({ source: 'demo' }) });
    const secret = 'Mr Alan Example, QQ 12 34 56 C';

    assert.equal(await ai.onDeviceStatus(), 'unavailable');
    assert.equal(await ai.photoStatus(), 'unavailable');
    await assert.rejects(() => ai.extract(secret), NoOnDeviceModelError);
    await assert.rejects(() => ai.transcribe({ mimeType: 'image/png', data: 'AAAA' }), NoOnDeviceModelError);
    await assert.rejects(() => ai.explain('[NAME_1] owes £100', { neverSend: true, placeholders: ['[NAME_1]'] }), NoOnDeviceModelError);
    // no project connected: rewrite falls back to the stand-in, still without a request
    const r = await ai.rewrite('Dear Sir, [NAME_1]', 'make it shorter');
    assert.equal(r.source, 'demo');

    assert.deepEqual(requests, [], 'a device-only step made a network request');
  } finally {
    globalThis.fetch = realFetch;
  }
});
