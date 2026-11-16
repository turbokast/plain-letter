# Demo video script (DRAFT, 16 Nov 2026)

Limit: 3 minutes (only the first 3 minutes may be judged). English. Public on YouTube. It must show the app working on Chrome. Aim for 2:40.

Not recorded yet. The scenes marked **needs the cloud step** cannot be recorded until a Firebase project is connected and that step has been checked. Every figure spoken or shown must be read from `eval/RESULTS.md` on the day of recording.

Recording notes: desktop Chrome with the on-device model already downloaded, window 1280 x 800, the made-up "HMRC: late filing penalty" sample (no real personal data anywhere on screen), the "What has left this device" panel visible the whole time. The narration is the account owner's to word; the lines below say what each scene has to get across, not what to say.

| Time | On screen | What the scene has to get across |
|---|---|---|
| 0:00 to 0:15 | A letter with name, address, NI number and UTR highlighted | The problem: official letters are hard to read, and they are full of details nobody should paste into a chatbot. |
| 0:15 to 0:30 | The Plain Letter page, status pills "On-device model: ready" and "Cloud step: connected" | What it is: the device hides the details, the cloud explains, the device puts the details back. |
| 0:30 to 1:00 | Press the sample letter, press "Hide my details". Step 2 appears: the text with placeholders, the table of what was found and by what (on-device model, pattern check) | Step 1 ran in the browser (Firebase AI Logic, only on-device). The right-hand panel still says "Nothing". Show the time it took. |
| 1:00 to 1:10 | Type one more word into "Hide this too" | The person stays in control: they see exactly what would be sent and can hide more. |
| 1:10 to 1:45 | **Needs the cloud step.** Press "Explain it and draft a reply". The answer appears; open the entry in the right-hand panel | Only the hidden version was sent; the panel shows it character for character. Plain-English meaning, what happens if ignored, options. |
| 1:45 to 2:05 | **Needs the cloud step.** Scroll to the reply draft; tick and untick "show what the cloud saw" | The reply has the real name and references in it, put back locally. The cloud only ever had placeholders. |
| 2:05 to 2:20 | Press "Shorter" | Small edits run on the device (prefer on-device): "Rewritten on this device. Nothing was sent." |
| 2:20 to 2:35 | Press "Stay on this device (basic answer)" on a second sample, or show "Read a photo of the letter" | No connection, or no wish to send anything: a shorter answer from the on-device model. A photo is read on the device only. |
| 2:35 to 2:50 | `eval/RESULTS.md` table, then the mode table from the README | The measured result on the sample letters, and the three Firebase AI Logic modes with the reason for each. Say what it is not: not legal, tax or debt advice. |

Shots to prepare before recording:

- The sample letter as a picture with the personal details marked (scene 1).
- A second Chrome profile, or the network switched off, if the fallback is to be shown live.

Do not show: the Firebase console, any key or token, a real letter, another person's details.
