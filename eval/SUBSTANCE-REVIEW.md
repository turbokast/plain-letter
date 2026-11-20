# Substance of the recorded cloud answers (read by hand, 20 Nov 2026)

Source: `eval/cloud-output.json` (one recorded run, 17 Nov 2026, gemini-3.5-flash-lite, 10 made-up sample letters). Each answer was read against the exact text that was sent. One reader (an AI agent, Claude), no second marker, so treat this as a careful check, not a score.

Amounts and dates: every amount and date in the 10 answers appears in its letter. None was invented or changed.

| Letter | Verdict | What was wrong |
|---|---|---|
| hmrc-late-filing | **misleading (1 point)** | The option "Pay the £100 by 14 December 2026 to avoid interest charges and further penalties" is wrong on further penalties: the letter ties the £10 daily penalties to the return staying outstanding, so the action that stops them is sending the return, which the answer never says. The reply draft also states "I had a reasonable excuse" as a fact. |
| council-tax-reminder | minor | "the full yearly balance will become due immediately": "immediately" is not in the letter. |
| landlord-rent-increase | correct | |
| dwp-overpayment | correct | Reply draft calls it an "alleged overpayment" and says "I believe it is incorrect" (a stance the person may not hold). |
| parking-pcn | correct | |
| county-court-claim | minor | Names Shelter (a housing charity) for a consumer-credit court claim. |
| energy-debt | correct | |
| hmrc-tax-code | correct | |
| bank-overdraft | correct | |
| nhs-penalty-charge | correct | Reply draft asserts "I held a valid prescription prepayment certificate". Separately, the NHS number was labelled `[NI_NUMBER_1]` (the on-device model's label; its kind list has no NHS number); the value was hidden and filled back correctly. Fixed 20 Nov: a checksum-verified NHS pattern hit on the same text now sets the label. |

Summary: 7 of 10 answers correct, 2 with a minor overstatement, 1 with a misleading statement about what stops further penalties. 3 reply drafts assert facts about the person that the letter does not show.

Change made the same day (`src/core/prompts.js`, EXPLAIN_SYSTEM): four rules (no "this avoids X" unless the letter says so, and name the action that stops growing charges; no added "immediately"/"automatically"; reply drafts leave an "[Add: ...]" note instead of asserting the person's facts; name an advice service only if it covers the letter's subject). **Not yet re-run against the cloud**: the next cloud run must re-read these four letters and update this file.
