# Devpost submission: field by field (DRAFT, 16 Nov 2026)

Not submitted. Lines marked **TO CHECK** state something that has not been run yet; they must be checked against a real run and corrected, or removed, before this is sent. Nothing here may claim more than `STATUS.md` says works.

Rules this follows (official rules, re-read 16 Nov 2026): a text description covering how Firebase AI Logic is used, the features, and the value; a public open-source repository (GitHub or GitLab) with the licence visible and Firebase AI Logic imported and called; a public YouTube video of 3 minutes at most, in English; a platform choice; a summary of what was built in the submission period. A hosted link is "highly encouraged", not required. App Check is required; debug tokens are accepted.

## Project name

Plain Letter

## Tagline (short)

Understand an official letter without handing your personal details to a cloud model.

## Platform

Web (Chrome).

## Entrant

TurboKast Ltd (organisation), with its founder as the Representative.

## What it does

Official letters (a tax penalty, a council tax reminder, a rent increase, a court claim) are hard to read and carry exactly the details people should not paste into a chatbot: name, address, National Insurance number, tax reference, account numbers.

Plain Letter splits the job in two:

1. **On the device.** Chrome's built-in model, called through Firebase AI Logic in `only_on_device` mode, finds the personal details in the letter. A pattern check for UK formats (National Insurance number, UTR, postcode, sort code, NHS number, references) runs as well. Each detail is swapped for a placeholder such as `[NAME_1]`. The page shows the exact text that would be sent, and anything else can be hidden by hand. A photo of a letter can be read into text here too, on the device only.
2. **In the cloud.** Only the hidden version goes to Gemini through Firebase AI Logic (`prefer_in_cloud`), for the harder work: what the letter means in plain English, what happens if it is ignored, the options, and a reply draft that still contains the placeholders. (Run on all 10 sample letters on 17 Nov: `eval/CLOUD-RESULTS.md`.)
3. **On the device again.** The placeholders are filled back in locally. The finished reply has the real name and references in it; the cloud never saw them.

"Stay on this device" gives a shorter answer from the on-device model with nothing sent. A panel, "What has left this device", lists every outgoing text character for character; it is written by the same code that sends.

It explains what a letter says. It is not legal, tax or debt advice, and says so on the page.

## How we used Firebase AI Logic

Every model call in the app goes through `firebase/ai` (`src/ai/firebase.js`). Hybrid inference is the design, not an add-on: the on-device step is a privacy gate that the cloud step depends on.

| Step | Mode | Sees |
|---|---|---|
| Find personal details, letter type, amount, key date (structured output) | `only_on_device` | the full letter |
| Read a photo of the letter (image input) | `only_on_device` | the picture |
| Explain and draft a reply (JSON schema) | `prefer_in_cloud` | the hidden version only |
| The same, "stay on this device" | `only_on_device` | the hidden version only |
| Rewrite the reply: shorter, firmer, simpler | `prefer_on_device` | the reply with placeholders |

Also used: Firebase App Check (required by Firebase AI Logic; reCAPTCHA on the hosted copy, debug token for test builds). **TO CHECK: debug token checked on 17 Nov (requests carry the App Check header); reCAPTCHA provider and enforcement not yet set up.** **TO CHECK: Firebase Hosting, if the hosted copy goes there.**

One thing we found and guard against: in the Firebase JavaScript SDK version we use (13.3.0), a browser with no built-in model at all sends an `only_on_device` call to the cloud instead of refusing it. Plain Letter therefore never relies on the mode alone. Device-only calls are refused before the SDK is called when the browser has no on-device model, they run on a second Firebase app with no real project behind it, and the answer is thrown away unless the SDK reports it came from the device. A test loads the real SDK and proves no request is made (`test/firebase-device-only.test.js`).

## Safety nets that do not depend on a model being right

- The pattern check always runs, with or without the on-device model.
- Before any text goes to a call that can reach the cloud, the app checks that no hidden value is still readable in it (ignoring spacing and punctuation). If one is, the send is blocked.
- An amount or date from the on-device model is shown only if its words are in the letter.
- A placeholder in the answer that is not one of the person's own is flagged.
- With no on-device model the page says "basic hiding only", asks the person to read the text before sending, and switches off the photo and stay-on-device buttons instead of sending anything in their place.

## Numbers (all from made-up sample letters; `eval/RESULTS.md`)

Use the figures in `eval/RESULTS.md` as generated on the day; do not copy numbers from this draft. As of 16 Nov: 10 sample letters, 68 labelled personal details; patterns alone hide 61 of 68; on-device model plus patterns hide 67 of 68; all 42 amounts and deadlines the cloud needs stay readable. Cloud step (one recorded run, 17 Nov, `eval/CLOUD-RESULTS.md`): 10 of 10 letters answered from the cloud, each answer states the main amount and deadline, each reply keeps the placeholders. **TO CHECK: re-run on the day and copy the figures from the file; substance of the explanations not scored.**

## What we built during the submission period

Everything. The repository's first commit is 14 November 2026; the submission period opened on 11 November 2026. There is no earlier code and the app had no users before the hackathon.

## How it was built (disclosure)

The code was written by AI coding agents (Claude Code) under the direction of the founder of TurboKast Ltd, who chose the idea, set the limits and reviewed the result. Libraries: the Firebase JavaScript SDK and Vite. No other pre-existing code.

## Built with

Firebase AI Logic (hybrid inference, JavaScript SDK), Gemini Nano in Chrome (built-in AI), Gemini (cloud, Gemini Developer API), Firebase App Check, JavaScript, Vite.

## Links

- Repository: **TO FILL** (public, Apache 2.0, licence shown in the About section)
- Try it: **TO FILL** (hosted copy), or the test instructions below
- Video: **TO FILL** (YouTube, public, 3 minutes at most)

## Testing instructions for judges

**TO CHECK once a hosted copy exists.** Draft:

1. Open the link in desktop Chrome on a computer that supports Chrome's built-in AI. The first use downloads the on-device model (about 4 GB, a few minutes); the page shows progress.
2. Press one of the made-up sample letters, then "Hide my details". Step 2 shows the exact text that would be sent.
3. Press "Explain it and draft a reply". The panel on the right shows what was sent. The reply has the details back in; tick "show what the cloud saw" to compare.
4. "Stay on this device" gives the on-device answer with nothing sent.
5. To run it locally instead: `npm install`, `npm test`, `npm run dev` (see README). Without a Firebase project the cloud step shows a fixed demo answer.

No login is needed. The sample letters contain no real personal data. The repository holds no API keys or secrets.

## Limits we state openly

- Web only; not built for Android or iOS.
- The on-device model does not give the same answer twice; see `eval/RESULTS.md` for what it missed.
- The rules name "Gemini Nano 4". The app uses whichever built-in model Chrome ships, through the Firebase AI Logic SDK, and cannot choose a version.
- Ten sample letters written by us is a small, friendly test.
