// The real provider: every model call in the app goes through Firebase AI Logic
// (firebase/ai). Three hybrid inference modes are used, each for a reason:
//
//   extract  ONLY_ON_DEVICE    sees the full letter, so it may never fall back to the cloud
//   explain  PREFER_IN_CLOUD   sees the redacted letter; cloud for the harder reasoning,
//                              on-device if the cloud cannot be reached
//            ONLY_ON_DEVICE    when the user chose "stay on this device"
//   rewrite  PREFER_ON_DEVICE  small edit of the redacted reply; free and fast on the
//                              device, cloud where the browser has no model

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { EXTRACT_SCHEMA, EXPLAIN_SCHEMA, EXPLAIN_SYSTEM, extractPrompt, explainPrompt, rewritePrompt } from '../core/prompts.js';

const TEXT_ONLY = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

// The SDK's own default for hybrid inference in firebase 13.3.0 (it is not exported).
const DEFAULT_CLOUD_MODEL = 'gemini-3.5-flash-lite';

// Placeholder values so the SDK can be created for on-device work before a
// Firebase project exists. No request can succeed with them, and none is made:
// in this state every cloud-capable call is replaced (see cloudStandIn).
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
  const app = initializeApp(config || LOCAL_ONLY_CONFIG);

  if (hasCloud) {
    // Firebase AI Logic requires App Check. A debug token is used in
    // development and for the judges' test build; reCAPTCHA on the hosted site.
    if (appCheck.debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheck.debugToken;
    if (appCheck.siteKey) {
      const Provider = appCheck.enterprise ? ReCaptchaEnterpriseProvider : ReCaptchaV3Provider;
      initializeAppCheck(app, { provider: new Provider(appCheck.siteKey), isTokenAutoRefreshEnabled: true });
    }
  }

  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const inCloudParams = (extra = {}) => ({ model: cloudModel || DEFAULT_CLOUD_MODEL, ...extra });
  const jsonCloud = (schema) => inCloudParams({ generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.2 } });

  const extractModel = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: { ...TEXT_ONLY }, promptOptions: { responseConstraint: EXTRACT_SCHEMA } },
  });
  const explainModel = (mode) =>
    getGenerativeModel(ai, {
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

  const where = (response) => (response.inferenceSource === InferenceSource.ON_DEVICE ? 'on-device' : 'cloud');

  async function onDeviceStatus() {
    if (typeof LanguageModel === 'undefined') return 'unavailable';
    try {
      return await LanguageModel.availability(TEXT_ONLY);
    } catch {
      return 'unavailable';
    }
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
      const { response } = await extractModel.generateContent(extractPrompt(letter));
      return JSON.parse(response.text());
    },

    async explain(redacted, { neverSend = false, placeholders = [] } = {}) {
      const prompt = EXPLAIN_SYSTEM + '\n\n' + explainPrompt(redacted, placeholders);
      if (!neverSend && !hasCloud) {
        if (!cloudStandIn) throw new Error('No Firebase project is configured, so there is no cloud step.');
        return cloudStandIn.explain(redacted, { placeholders });
      }
      const { response } = await (neverSend ? explainLocal : explainHybrid).generateContent(prompt);
      return { result: JSON.parse(response.text()), source: where(response) };
    },

    async rewrite(redactedReply, instruction) {
      try {
        const { response } = await rewriteModel.generateContent(rewritePrompt(redactedReply, instruction));
        return { text: response.text().trim(), source: where(response) };
      } catch (e) {
        if (!hasCloud && cloudStandIn) return cloudStandIn.rewrite(redactedReply, instruction);
        throw e;
      }
    },
  };
}
