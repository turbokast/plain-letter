# Status: Mon 16 Nov 2026

Works (run and checked in headless Chrome 157, see README "What is done"):
- on-device hiding through Firebase AI Logic (`only_on_device`), pattern check, leak gate, fill-back
- on-device explanation and reply ("stay on this device"), on-device rewrite
- photo of a letter read into text on the device (drawn test pictures only)
- a browser with no on-device model: basic hiding, device-only buttons off, no request leaves the page
- 42 offline tests pass; evaluation: 67/68 details hidden with model plus patterns, 61/68 with patterns alone; pictures: 64/68 and 67/68 labelled details read exactly, 42/42 needed facts

Fixed on 16 Nov (both present in the 14 Nov build):
- the SDK sent `only_on_device` calls to the cloud when the browser had no on-device model at all; the app now refuses those calls itself
- the gate refused to send some letters because a hidden town was still readable elsewhere in the text

Untested:
- the cloud step (no Firebase project yet), App Check, hosting, free-tier quota
- phone photos of real paper, other browsers, phones, screen readers, long letters

Not built:
- hosted copy, video; SUBMISSION.md and DEMO-SCRIPT.md are drafts with open items

Risks:
- "Gemini Nano 4" in the rules against `nano_v3` in Chrome's log
- on-device output varies from run to run
- the device-only guard is checked against firebase 13.3.0 only
- web only, so mainly in the running for Best Web/Chrome

## 18 Nov 2026
- Reply drafts never carry a password, PIN or access code: the prompt says so, and a device-side guard (src/core/secrets.js) removes any placeholder the letter introduces as one from the reply, after the cloud explanation and after every rewrite. Replayed on the 10 recorded cloud answers: 1 reply changed (the county court claim password), 9 untouched. 46 offline tests pass. Not yet re-run live against the cloud.

## 19 Nov 2026
- App Check: reCAPTCHA Enterprise key made by the account owner (domains plain-letter.pages.dev and localhost) and registered in Firebase App Check as the Fraud Defense provider. Enforcement for Firebase AI Logic is still off.
- Hosted preview on Cloudflare Pages (preview branch; the main plain-letter.pages.dev address has no deployment yet). Built with `npm run build:hosted`, which leaves the debug token out; checked: the token is not in the bundle, the site key is.
- Checked on the preview, in one headless Chrome with its built-in model hidden (the no-model path): the App Check token exchange answered 200, the cloud request carried the token, and two sample letters (council tax, HMRC) were answered from the cloud with placeholders in the reply and details filled back on the device. Not checked there: a browser with the on-device model, phones, other browsers.
