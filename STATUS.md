# Status: Sat 14 Nov 2026

Works (run and checked in headless Chrome 157, see README "What is done"):
- on-device hiding through Firebase AI Logic (`only_on_device`), pattern check, leak gate, fill-back
- on-device explanation and reply ("stay on this device"), on-device rewrite
- 36 offline tests pass; evaluation: 67/68 details hidden with model plus patterns, 61/68 with patterns alone

Untested:
- the cloud step (no Firebase project yet), App Check, hosting, free-tier quota
- a browser without the on-device model, phones, screen readers, long letters

Not built:
- photo input, submission text, demo script, video

Risks:
- "Gemini Nano 4" in the rules against `nano_v3` in Chrome's log
- on-device output varies from run to run
- web only, so mainly in the running for Best Web/Chrome
