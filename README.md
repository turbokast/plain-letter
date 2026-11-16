# Plain Letter

Understand an official letter without handing your personal details to a cloud model.

You paste a letter from HMRC (or choose a photo of it, which is read into text on your device), the council, a landlord or a court. Plain Letter:

1. **Hides your details on your own device.** Chrome's on-device model (Gemini Nano, called through Firebase AI Logic in `only_on_device` mode) and a deterministic pattern check for UK formats (National Insurance number, UTR, postcode, sort code, NHS number, references) replace each detail with a placeholder such as `[NAME_1]`. You see exactly the text that would be sent and can hide anything else by hand.
2. **Sends only the hidden version to the cloud** (Gemini through Firebase AI Logic, `prefer_in_cloud`) for the harder work: what the letter means in plain English, what happens if you ignore it, your options, and a reply draft that still contains the placeholders.
3. **Puts your details back locally.** The finished reply has your real name and references in it. The cloud never saw them.

If you choose "Stay on this device", or the cloud cannot be reached, a shorter answer comes from the on-device model and nothing is sent. Small edits to the reply (shorter, firmer, simpler) run on the device when a model is there (`prefer_on_device`).

A panel on the page, "What has left this device", lists every outgoing text character for character. It is written by the same code that sends.

Plain Letter explains what a letter says. It is not legal, tax or debt advice.

Built for the [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com/) hackathon. Web (Chrome) only.

## Where each step runs

| Step | Firebase AI Logic mode | Sees | Why |
|---|---|---|---|
| Find personal details, letter type, amount, key date | `only_on_device` | the full letter | this is the privacy gate, so it may never fall back to the cloud |
| Read a photo of the letter into text (image input) | `only_on_device` | the picture | a photo cannot have its details hidden first, so there is no cloud path for it at all |
| Explain and draft a reply | `prefer_in_cloud` | the hidden version only | harder reasoning; falls back to the device if the cloud is unreachable |
| The same, when you say "stay on this device" | `only_on_device` | the hidden version only | nothing is sent |
| Rewrite the reply (shorter, firmer, simpler) | `prefer_on_device` | the reply with placeholders | small job: free and fast locally, cloud where the browser has no model |

Code: `src/ai/firebase.js` (every model call, all through `firebase/ai`), `src/core/pipeline.js` (the order of steps and the gate), `src/core/redact.js` and `src/core/patterns.js` (hiding), `src/core/fillback.js` (putting details back).

Safety nets that do not depend on a model being right:

- **The mode is not trusted on its own.** In the Firebase JavaScript SDK 13.3.0, a browser with no built-in model at all (`LanguageModel` missing) gets no on-device adapter, and the SDK then sends every call to the cloud, `only_on_device` included. We found this on 16 November 2026 by running such a browser. Every device-only call now goes through one function (`deviceOnly` in `src/ai/firebase.js`) that refuses before the SDK is called when there is no on-device model, uses a second Firebase app with no real project or key behind it, and throws the answer away unless the SDK reports it came from the device. `test/firebase-device-only.test.js` loads the real SDK with no on-device model and fails if a single request is made.

- The pattern check always runs, with or without the on-device model.
- Before any text is handed to a call that can reach the cloud, `findLeaks` checks that no hidden value is still readable in it (ignoring spacing and punctuation). If one is, the send is blocked.
- An amount or date from the on-device model is shown only if its words are in the letter.
- A placeholder in the answer that is not one of yours is flagged instead of being left to look like a real value.
- In a browser with no on-device model the page says "basic hiding only" and asks you to read the text before sending. The photo button and "Stay on this device" are switched off there; nothing is sent in their place.

## Run it

Needs Node 22 and a desktop Chrome that has the built-in on-device model (checked on Chrome 157; Chrome's own hardware requirements for built-in AI apply, and the first use downloads about 4 GB).

```
npm install
npm test          # 40 offline tests, no network, no model
npm run eval      # rewrites eval/RESULTS.md from the sample letters
npm run dev       # http://localhost:5174
```

Without a Firebase project the app still runs: the on-device steps are real, and the cloud step shows a fixed answer marked "demo" (nothing is sent). To connect the cloud step, copy `.env.example` to `.env.local` and fill in the Firebase web config and the App Check values. Firebase AI Logic requires App Check; a debug token is enough for a local or test build.

To drive the page in a separate headless Chrome (how the checks below were made): `scripts/cdp.py`.

## What is done (Mon 16 Nov 2026)

Checked by running it, in headless Chrome 157 on Linux with an NVIDIA RTX 4060 (14 and 16 November):

- On-device hiding through the Firebase AI Logic SDK: model download with a progress bar (4 to 7 minutes), structured output, 10 to 30 seconds per letter.
- On the 10 made-up sample letters (`eval/letters.js`, 68 labelled details): patterns alone hide 61 of 68 (89.7%); on-device model plus patterns hide 67 of 68 (98.5%), 9 of 10 letters with nothing missed; all 42 amounts and deadlines the cloud needs stay readable. One recorded run, not cherry-picked: `eval/RESULTS.md`, raw model output in `eval/nano-output.json`.
- "Stay on this device": explanation, options and reply draft from the on-device model in 18 to 38 seconds, placeholders kept, details filled back, nothing logged as sent and no request to any other site (checked 16 Nov).
- Rewrite on the device, the hide-by-hand box, the "what has left this device" panel, the demo cloud answer.
- **Photo of a letter (16 Nov).** The button reads a JPEG or PNG into the letter box with the on-device model (image input, `only_on_device`), 13 to 27 seconds. On pictures drawn from the 10 sample letters, one run: clean pictures 64 of 68 labelled details and 42 of 42 needed facts read exactly; rougher pictures (grey, turned 2 degrees, slightly blurred) 67 of 68 and 42 of 42. Misreads were a postcode, a surname, a court reference and a village name, which is why the page asks for the text to be checked against the paper. Raw output: `eval/photo-output.json`.
- **A browser with no on-device model (16 Nov)**, Chrome 157 started with its built-in AI switched off: the page says "basic hiding only", the pattern check runs, the photo and stay-on-device buttons are off, and no request leaves the page.
- 42 offline tests of the patterns, redaction, leak gate, fill-back, pipeline rules, photo rules, date maths and the device-only guard against the real SDK.

Two faults found on 16 November by those runs, both fixed and both with a test that fails on the old code:

1. With no on-device model in the browser, the SDK sent the `only_on_device` calls to the cloud (see "The mode is not trusted on its own" above). In our run the app had no Firebase project, so the three requests carried a made-up sample letter and a placeholder key and were refused. With a real project connected, the full letter would have been sent. The 14 November build had this fault.
2. A town hidden by its place in the address block was left readable where it appeared elsewhere in the letter. The gate caught it and refused to send, so nothing would have leaked, but the person was stuck. This happened on some sample letters even with patterns alone. A hidden value is now hidden everywhere.

## What is not done, and known weak points

- **The cloud step has never run.** It needs a Firebase project (free Spark plan, Gemini Developer API). The code path is written (`prefer_in_cloud`, JSON schema, App Check) but untested; the cloud prompt has not been tried on any letter. Free-tier quota against judges' use is not measured.
- App Check is wired but not registered anywhere. No hosted copy yet.
- Photos: tested only on pictures drawn by a script, in one size and one typeface. No phone photo of real paper, no two-page letter, no handwriting, no table has been tried. The picture is scaled to 1,600 pixels on its long side before reading; whether that is the best size is not measured.
- Hiding a value everywhere costs some meaning: when the person's town is also in the sender's name or web address ("Eastmere Borough Council"), the cloud sees a placeholder there too. The effect on the explanation is not measured (no cloud run yet).
- The on-device model is not the same twice: in one run it missed a town in an address written on one line; in another it found it. It worked out a date that was not in the letter twice in ten (the app drops those), and once named a placeholder that did not exist (the app flags it). A postcode read wrongly from a picture in the evaluation run was read correctly in another run of the same picture.
- The rules name "Gemini Nano 4". Chrome 157 here logs its model as `nano_v3`. We use whatever model Chrome ships through the Firebase AI Logic SDK and cannot choose the version.
- The device-only guard is checked against firebase 13.3.0 only. `package.json` allows newer 13.x versions; the test must be re-run after any update.
- Not tried: a browser from another maker (Firefox, Safari), phones, screen readers, long letters (the on-device input limit is about 9,000 tokens).
- `SUBMISSION.md` and `DEMO-SCRIPT.md` are drafts with open items marked. No video.

## Plan, working back from the deadline

Deadline: Mon 30 Nov 2026, 2:00 pm Pacific = 22:00 UK. Target: ready a week early.

| Date | Milestone |
|---|---|
| Sat 14 Nov | Done: core, on-device steps through Firebase AI Logic, page, tests, evaluation |
| Mon 16 Nov | Done: photo of a letter, browser without a model checked for real, two faults fixed, submission and demo drafts. Not done: the Firebase project does not exist yet |
| Tue 17 to Wed 18 Nov | Firebase project exists (needs the account owner). Connect the cloud step, App Check debug token, first end-to-end run, measure free-tier quota |
| Thu 19 Nov | Tune the cloud prompt on the sample letters; add cloud results to the evaluation |
| Fri 20 Nov | Hosted copy with App Check (reCAPTCHA) on its domain; phone layout, keyboard and screen-reader pass |
| Sat 21 to Sun 22 Nov | Finish SUBMISSION.md and DEMO-SCRIPT.md from real cloud runs; demo video (3 minutes at most) |
| Mon 23 Nov | Submission-ready; hand over for review |
| Tue 24 to Sat 28 Nov | Margin: fixes from the review; public repository and video |
| Mon 30 Nov 22:00 UK | Submitted |

The dates from 17 Nov on hold only if the Firebase project exists by Wed 18 Nov. Each day it is later moves "submission-ready" a day past 23 Nov; the hard deadline stays reachable until about Wed 25 Nov.

## How this was built

All code here was written during the hackathon submission period (from 11 November 2026) by AI coding agents (Claude Code) under the direction of the founder of TurboKast Ltd. There is no pre-existing code. Libraries: the Firebase JavaScript SDK and Vite.

## Licence

Apache 2.0. See `LICENSE`.
