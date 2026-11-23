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

## 20 Nov 2026
- Keyboard and narrow screens, checked by reading the code (no browser run today): after "Hide my details" and "Explain it" the new step's heading now takes focus (before, the disabled button dropped focus to the top of the page); a busy button gets focus back if nothing else took it; scrolling is instant when the system asks for reduced motion; the two note lines are announced (role status); the focus ring is dark green on the light page (about 7:1, was about 2.3:1, under the 3:1 minimum) and stays light green in the dark panel; the download bar no longer overflows a 320 px screen. 46 offline tests pass; hosted build has no debug token; preview redeployed.
- Not checked yet: the same in a real browser (Tab order, a 320 px window, a screen reader), App Check enforcement, the on-device model on the hosted preview, the video.
- Substance of the 10 recorded cloud answers read by hand (eval/SUBSTANCE-REVIEW.md): amounts and dates all match; 7 correct, 2 minor overstatements, 1 misleading (HMRC: says paying avoids further penalties; the daily penalties stop when the return is sent); 3 reply drafts assert facts about the person. Four prompt rules added to EXPLAIN_SYSTEM; not yet re-run against the cloud. NHS number was labelled NI_NUMBER (the on-device model's label; it has no NHS kind): fixed, a checksum-verified NHS pattern hit on the same text now names it NHS_NUMBER (test added, 47 pass; offline evaluation re-run, figures unchanged).

## 21 Nov 2026
- Cloud step re-run on all 10 sample letters after the four prompt rules (local build, App Check debug token, on-device model plus patterns): 10 of 10 answered from the cloud in 1.9 to 3.3 s, no labelled detail readable in any text sent, amount and deadline stated 10 of 10, placeholders kept 10 of 10 (`eval/CLOUD-RESULTS.md`). Read by hand (`eval/SUBSTANCE-REVIEW.md`): 8 of 10 correct, 2 minor (the HMRC answer does not name sending the return as what stops the daily penalties; the DWP answer adds "automatically"), none misleading; no reply draft asserts a fact about the person.
- Hosted preview with the on-device model, in a separate headless Chrome: hiding ran on the device (model plus patterns), the rewrite ran on the device, details were filled back. The cloud step did not run there: App Check answered "App attestation failed" (403) to the reCAPTCHA Enterprise token from the automated headless browser, the cloud call was refused, and the app fell back to the on-device answer as designed. A normal Chrome is expected to pass attestation (it did on 19 Nov), but this has to be checked by a person on the hosted copy before submitting.
- Keyboard and narrow screens in a real browser (headless Chrome, axe-core WCAG 2.2 AA): Tab order runs through the samples, the letter, the photo button and "Hide my details"; focus moves to the step 2 and step 3 headings; axe found no violations at 1280, 390 and 320 px or in dark mode. Found and fixed: the page scrolled sideways on narrow screens (86 px at 320 px, 16 px at 390 px; the one-column grid was sized to its widest child, and long placeholders in the details table did not wrap). Not checked: a screen reader.
- Demo video: a captioned draft (no voice), 2 min 52 s, 1280 x 800, recorded from the local build with the on-device model and the cloud step. Not uploaded.
- Not done: App Check enforcement (still off).

## 23 Nov 2026
- Account owner tried the hosted preview in his own Chrome: the answer said "Written by the cloud model" (21 Nov). He approved going live on 23 Nov.
- Live: https://plain-letter.pages.dev (Cloudflare Pages production, commit fe08bff, `npm run build:hosted`; checked: the debug token is not in the bundle).
- App Check enforcement for Firebase AI Logic switched on in the Firebase console (Basic: Enforced; Replay: Off). Before switching: 26 of 30 requests in 7 days verified, 2 from outdated clients, 2 invalid (the automated headless browser).
- Repository made public: https://github.com/turbokast/plain-letter (Apache 2.0).
- Video: the account owner asked for a voice-over and music on the captioned draft; not uploaded yet.
