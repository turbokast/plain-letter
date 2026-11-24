# Demo video: narration, voice and music (24 Nov 2026)

The demo video is the captioned screen recording of 21 Nov 2026 with a narration and a quiet music bed added. Nothing on screen was re-recorded; the end card is held 7 seconds longer and carries the AI disclosure. Length 2 min 58.6 s.

| Part | Source | Licence |
|---|---|---|
| Narration text | `scenes.json` in this folder (start time and words per scene), written for this project | Apache-2.0, as the rest of this repository |
| Voice | Synthetic. Kokoro-82M v1.0 (voice `bm_george`), run locally with `kokoro-onnx` (`tts_kokoro.py`). No human voice was recorded or cloned for this video | Kokoro-82M model weights: Apache-2.0 (hexgrad/Kokoro-82M). kokoro-onnx: MIT |
| Music | Generated from scratch by `music_bed.py`: sine waves with slow envelopes, a four-chord loop written for this video. No samples, loops or third-party recordings | Original work by TurboKast Ltd, Apache-2.0 with this repository. No third-party rights, so no Content ID claim can apply to it |
| Assembly | `build.py` (ffmpeg): narration placed at each scene's start, music at about 17 dB under and ducked further while the voice speaks, programme loudness about -16 LUFS | |

Figures spoken in the narration were read on 24 Nov 2026 from `eval/CLOUD-RESULTS.md` (recorded run of 21 Nov: 10 of 10 letters answered from the cloud, a labelled personal detail still readable in the text sent in 0 of 10, amount and deadline stated in 10 of 10, placeholders kept in 10 of 10).

The narration was read back with a speech recogniser (faster-whisper, base.en) and compared with `scenes.json` by eye.

Disclosure: the code was written by AI coding agents under the direction of the founder of TurboKast Ltd. The video, its narration and its music were produced by AI agents.

To rebuild:

```
python tts_kokoro.py <folder with kokoro-v1.0.onnx and voices-v1.0.bin> voice/
python music_bed.py music-bed.wav 178.6
python3 build.py <captioned recording.mp4> voice/ music-bed.wav out.mp4
```
