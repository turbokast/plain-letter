// The real provider: every model call in the app goes through Firebase AI Logic
// (firebase/ai). Three hybrid inference modes are used, each for a reason:
//
//   extract  ONLY_ON_DEVICE    sees the full letter, so it may never fall back to the cloud
//   explain  PREFER_IN_CLOUD   sees the redacted letter; cloud for the harder reasoning,
//                              on-device if the cloud cannot be reached
//            ONLY_ON_DEVICE    when the user chose "stay on this device"
//   rewrite  PREFER_ON_DEVICE  small edit of the redacted reply; free and fast on the
//                              device, cloud where the browser has no model
//   photo    ONLY_ON_DEVICE    reads a photo of the letter into text; the image never leaves
//
// IMPORTANT (found 16 Nov 2026 by running a browser with no on-device model):
// in firebase 13.3.0, if the browser has no `LanguageModel` at all, the SDK
// creates no on-device adapter and sends EVERY call to the cloud, whatever the
// mode, ONLY_ON_DEVICE included. So the mode alone is not the privacy gate.
// Every device-only call here goes through deviceOnly(), which
//   1. refuses before calling the SDK when the browser has no on-device model,
//   2. uses a second Firebase app that has no real project or key, so a request
//      that did slip out could not be answered, and
//   3. checks afterwards that the SDK reports the answer came from the device.

import { initializeApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { EXTRACT_SCHEMA, EXPLAIN_SCHEMA, EXPLAIN_SYSTEM, TRANSCRIBE_PROMPT, extractPrompt, explainPrompt, rewritePrompt } from '../core/prompts.js';

const TEXT_ONLY = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

const TEXT_AND_IMAGE = {
  expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

export class NoOnDeviceModelError extends Error {
  constructor(message = 'This browser has no on-device model, so this step cannot run. Nothing was sent.') {
    super(message);
    this.name = 'NoOnDeviceModelError';
  }
}

// The SDK's own default for hybrid inference in firebase 13.3.0 (it is not exported).
const DEFAULT_CLOUD_MODEL = 'gemini-3.5-flash-lite';

// Placeholder values for the Firebase app that carries the device-only calls
// (and every call while no Firebase project exists). No request can succeed
// with them, and deviceOnly() makes sure none is made.
const LOCAL_ONLY_CONFIG = { apiKey: 'local-only', projectId: 'local-only', appId: 'local-only' };

/**
 * @param {object} o
 * @param {object|null} o.config Firebase web config, or null to run on-device only
 * @param {{siteKey?:string, enterprise?:boolean, debugToken?:string|boolean}} [o.appCheck]
 * @param {string} [o.cloudModel]
 * @param {object} [o.cloudStandIn] provider used for cloud calls when there is no config (local development)
 */
export function createFirebaseAI({ config, appCheck = {}, cloudModel, cloudStandIn = null }) {
  const hasCloud = Boolean(config);
  const app = hasCloud ? initializeApp(config) : null;
  const deviceApp = initializeApp(LOCAL_ONLY_CONFIG, 'plain-letter-device-only');

  if (hasCloud) {
    // Firebase AI Logic requires App Check. A debug token is used in
    // development and for the judges' test build; reCAPTCHA on the hosted site.
    // App Check is only switched on by initializeAppCheck(); setting the debug
    // token alone does nothing (found 17 Nov 2026: requests went out with no
    // App Check header). With a debug token and no site key, a provider that
    // can never attest is used: in debug mode the SDK exchanges the debug
    // token instead and never asks the provider.
    if (appCheck.debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheck.debugToken;
    if (appCheck.siteKey) {
      const Provider = appCheck.enterprise ? ReCaptchaEnterpriseProvider : ReCaptchaV3Provider;
      initializeAppCheck(app, { provider: new Provider(appCheck.siteKey), isTokenAutoRefreshEnabled: true });
    } else if (appCheck.debugToken) {
      const debugOnly = new CustomProvider({ getToken: () => Promise.reject(new Error('App Check: debug token only, no attestation provider')) });
      initializeAppCheck(app, { provider: debugOnly, isTokenAutoRefreshEnabled: true });
    }
  }

  const deviceAi = getAI(deviceApp, { backend: new GoogleAIBackend() });
  const ai = hasCloud ? getAI(app, { backend: new GoogleAIBackend() }) : deviceAi;
  const inCloudParams = (extra = {}) => ({ model: cloudModel || DEFAULT_CLOUD_MODEL, ...extra });
  const jsonCloud = (schema) => inCloudParams({ generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.2 } });

  const extractModel = getGenerativeModel(deviceAi, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: { ...TEXT_ONLY }, promptOptions: { responseConstraint: EXTRACT_SCHEMA } },
  });
  const explainModel = (mode) =>
    getGenerativeModel(mode === InferenceMode.ONLY_ON_DEVICE ? deviceAi : ai, {
      mode,
      inCloudParams: jsonCloud(EXPLAIN_SCHEMA),
      onDeviceParams: { createOptions: { ...TEXT_ONLY }, promptOptions: { responseConstraint: EXPLAIN_SCHEMA } },
    });
  const explainHybrid = explainModel(InferenceMode.PREFER_IN_CLOUD);
  const explainLocal = explainModel(InferenceMode.ONLY_ON_DEVICE);
  const rewriteModel = getGenerativeModel(ai, {
    mode: hasCloud ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_ON_DEVICE,
    inCloudParams: inCloudParams(),
    onDeviceParams: { createOptions: { ...TEXT_ONLY } },
  });
  const photoModel = getGenerativeModel(deviceAi, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: { ...TEXT_AND_IMAGE } },
  });

  const where = (response) => (response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'cloud');
  const hasDeviceApi = () => typeof LanguageModel !== 'undefined';

  async function availability(options) {
    if (!hasDeviceApi()) return 'unavailable';
    try {
      return await LanguageModel.availability(options);
    } catch {
      return 'unavailable';
    }
  }
  const onDeviceStatus = () => availability(TEXT_ONLY);

  /** The only way a device-only model is ever called. See the note at the top of this file. */
  async function deviceOnly(model, request) {
    if (!hasDeviceApi()) throw new NoOnDeviceModelError();
    const { response } = await model.generateContent(request);
    if (response.inferenceSource !== InferenceSource.ON_DEVICE) {
      throw new NoOnDeviceModelError('The answer did not come from the on-device model, so it was thrown away.');
    }
    return response;
  }

  return {
    name: hasCloud ? 'firebase' : 'firebase-on-device-only',
    hasCloud,
    onDeviceStatus,

    /** Download the on-device model if needed. Must be called from a click. */
    async prepare(onProgress) {
      if ((await onDeviceStatus()) === 'unavailable') return 'unavailable';
      await extractModel.initializeDeviceModel(onProgress);
      return onDeviceStatus();
    },

    async extract(letter) {
      const response = await deviceOnly(extractModel, extractPrompt(letter));
      return JSON.parse(response.text());
    },

    /** 'available', 'downloadable', 'downloading' or 'unavailable' for reading a photo on the device. */
    photoStatus: () => availability(TEXT_AND_IMAGE),

    /**
     * Read a photo of a letter into text, on the device only. The image is
     * never handed to a call that can reach the cloud.
     * @param {{mimeType:'image/jpeg'|'image/png', data:string}} image base64 data, no "data:" prefix
     */
    async transcribe(image) {
      const response = await deviceOnly(photoModel, [{ inlineData: { mimeType: image.mimeType, data: image.data } }, { text: TRANSCRIBE_PROMPT }]);
      return { text: response.text(), source: 'on-device' };
    },

    async explain(redacted, { neverSend = false, placeholders = [] } = {}) {
      const prompt = EXPLAIN_SYSTEM + '\n\n' + explainPrompt(redacted, placeholders);
      if (!neverSend && !hasCloud) {
        if (!cloudStandIn) throw new Error('No Firebase project is configured, so there is no cloud step.');
        return cloudStandIn.explain(redacted, { placeholders });
      }
      const response = neverSend ? await deviceOnly(explainLocal, prompt) : (await explainHybrid.generateContent(prompt)).response;
      const result = JSON.parse(response.text());
      if (typeof result.reply_draft === 'string') result.reply_draft = result.reply_draft.replace(/^[\s¿¡]+/, '');
      return { result, source: where(response) };
    },

    async rewrite(redactedReply, instruction) {
      try {
        const request = rewritePrompt(redactedReply, instruction);
        const response = hasCloud ? (await rewriteModel.generateContent(request)).response : await deviceOnly(rewriteModel, request);
        // The on-device model sometimes echoes the "REPLY:" label or starts with a stray mark.
        const text = response.text().replace(/^\s*(?:REPLY:)?[\s¿¡]*/i, '').trim();
        return { text, source: where(response) };
      } catch (e) {
        if (!hasCloud && cloudStandIn) return cloudStandIn.rewrite(redactedReply, instruction);
        throw e;
      }
    },
  };
}
