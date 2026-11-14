# Plain Letter

Understand an official letter without handing your personal details to a cloud model.

You paste a letter from HMRC, the council, a landlord or a court. Plain Letter:

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
| Explain and draft a reply | `prefer_in_cloud` | the hidden version only | harder reasoning; falls back to the device if the cloud is unreachable |
| The same, when you say "stay on this device" | `only_on_device` | the hidden version only | nothing is sent |
| Rewrite the reply (shorter, firmer, simpler) | `prefer_on_device` | the reply with placeholders | small job: free and fast locally, cloud where the browser has no model |

Code: `src/ai/firebase.js` (every model call, all through `firebase/ai`), `src/core/pipeline.js` (the order of steps and the gate), `src/core/redact.js` and `src/core/patterns.js` (hiding), `src/core/fillback.js` (putting details back).

Safety nets that do not depend on a model being right:

- The pattern check always runs, with or without the on-device model.
- Before any text is handed to a call that can reach the cloud, `findLeaks` checks that no hidden value is still readable in it (ignoring spacing and punctuation). If one is, the send is blocked.
- An amount or date from the on-device model is shown only if its words are in the letter.
- A placeholder in the answer that is not one of yours is flagged instead of being left to look like a real value.
- In a browser with no on-device model the page says "basic hiding only" and asks you to read the text before sending.

## Run it

Needs Node 22 and Chrome 138 or later on a desktop (the on-device model needs about 22 GB of free disk and a GPU with more than 4 GB of memory, or 16 GB of RAM; the first use downloads about 4 GB).

```
npm install
npm test          # 36 offline tests, no network, no model
npm run eval      # rewrites eval/RESULTS.md from the sample letters
npm run dev       # http://localhost:5174
```

Without a Firebase project the app still runs: the on-device steps are real, and the cloud step shows a fixed answer marked "demo" (nothing is sent). To connect the cloud step, copy `.env.example` to `.env.local` and fill in the Firebase web config and the App Check values. Firebase AI Logic requires App Check; a debug token is enough for a local or test build.

To drive the page in a separate headless Chrome (how the checks below were made): `scripts/cdp.py`.

## What is done (Sat 14 Nov 2026)

Checked by running it, in headless Chrome 157 on Linux with an NVIDIA RTX 4060:

- On-device hiding through the Firebase AI Logic SDK: model download with a progress bar (about 4 minutes), structured output, 10 to 19 seconds per letter.
- On the 10 made-up sample letters (`eval/letters.js`, 68 labelled details): patterns alone hide 61 of 68 (89.7%); on-device model plus patterns hide 67 of 68 (98.5%), 9 of 10 letters with nothing missed; all 42 amounts and deadlines the cloud needs stay readable. One recorded run, not cherry-picked: `eval/RESULTS.md`, raw model output in `eval/nano-output.json`.
- "Stay on this device": explanation, options and reply draft from the on-device model in 18 to 27 seconds, placeholders kept, details filled back, nothing logged as sent.
- Rewrite on the device, the hide-by-hand box, the "what has left this device" panel, the demo cloud answer.
- 36 offline tests of the patterns, redaction, leak gate, fill-back, pipeline rules and date maths.

## What is not done, and known weak points

- **The cloud step has never run.** It needs a Firebase project (free Spark plan, Gemini Developer API). The code path is written (`prefer_in_cloud`, JSON schema, App Check) but untested; the cloud prompt has not been tried on any letter. Free-tier quota against judges' use is not measured.
- App Check is wired but not registered anywhere. No hosted copy yet.
- Photo of a letter (image input to the on-device model): not built.
- The on-device model is not the same twice: in one run it missed a town in an address written on one line; in another it found it. It worked out a date that was not in the letter twice in ten (the app drops those), and once named a placeholder that did not exist (the app flags it).
- The rules name "Gemini Nano 4". Chrome 157 here logs its model as `nano_v3`. We use whatever model Chrome ships through the Firebase AI Logic SDK and cannot choose the version.
- Not tried: a browser without the on-device model (covered only by tests), phones, screen readers, long letters (the on-device input limit is about 9,000 tokens).
- No submission text, demo script or video yet.

## Plan, working back from the deadline

Deadline: Mon 30 Nov 2026, 2:00 pm Pacific = 22:00 UK. Target: ready a week early.

| Date | Milestone |
|---|---|
| Sat 14 Nov | Done: core, on-device steps through Firebase AI Logic, page, tests, evaluation |
| Mon 16 to Tue 17 Nov | Firebase project exists (needs the account owner). Connect the cloud step, App Check debug token, first end-to-end run, measure free-tier quota |
| Wed 18 Nov | Tune the cloud prompt on the sample letters; add cloud results to the evaluation |
| Thu 19 Nov | Photo of a letter (image input on the device); browser without a model checked for real |
| Fri 20 Nov | Hosted copy with App Check (reCAPTCHA) on its domain; phone layout, keyboard and screen-reader pass |
| Sat 21 to Sun 22 Nov | SUBMISSION.md, DEMO-SCRIPT.md, demo video (3 minutes at most) |
| Mon 23 Nov | Submission-ready; hand over for review |
| Tue 24 to Sat 28 Nov | Margin: fixes from the review; public repository and video |
| Mon 30 Nov 22:00 UK | Submitted |

The dates from 16 Nov on hold only if the Firebase project exists by Tue 17 Nov. Each day it is later moves "submission-ready" a day past 23 Nov; the hard deadline stays reachable until about Wed 25 Nov.

## How this was built

All code here was written during the hackathon submission period (from 11 November 2026) by AI coding agents (Claude Code) under the direction of the founder of TurboKast Ltd. There is no pre-existing code. Libraries: the Firebase JavaScript SDK and Vite.

## Licence

Apache 2.0. See `LICENSE`.
