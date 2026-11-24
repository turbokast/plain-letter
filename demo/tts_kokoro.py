# Narration with the free local Kokoro voice (bm_george). Usage: python tts_kokoro.py <model dir> <out dir>
import json, os, sys, soundfile as sf
from kokoro_onnx import Kokoro
here = os.path.dirname(os.path.abspath(__file__))
tts, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
k = Kokoro(os.path.join(tts, "kokoro-v1.0.onnx"), os.path.join(tts, "voices-v1.0.bin"))
for s in json.load(open(os.path.join(here, "scenes.json"))):
    a, sr = k.create(s["text"], voice="bm_george", speed=1.0, lang="en-gb")
    sf.write(os.path.join(out, s["id"] + ".wav"), a, sr)
    print(s["id"], s["at"], round(len(a) / sr, 2), flush=True)
