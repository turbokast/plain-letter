# Assembles the voiced cut: captioned screen recording + narration (placed at each scene's start) + ducked music bed.
# Usage: python3 build.py <captioned.mp4> <voice dir> <music.wav> <out.mp4>
import json, os, subprocess, sys
src, vdir, music, out = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
scenes = json.load(open(os.path.join(here, "scenes.json")))
EXTRA = 7.0          # hold the end card so the closing line fits
CARD_AT = 164.8      # end card start in the captioned recording
FONT = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode().strip())
total = dur(src) + EXTRA
end = 0
for s in scenes:
    assert s["at"] >= end, (s["id"], "overlaps the line before it")
    end = s["at"] + dur(os.path.join(vdir, s["id"] + ".wav"))
assert end < total - 0.3 and total < 180, (end, total)
lines = ["Code written by AI coding agents, directed by Liam Humphreys, TurboKast Ltd.", "This video, its narration (synthetic voice) and its music were produced by AI agents."]
draw = []
for i, t in enumerate(lines):
    tf = os.path.join(os.path.dirname(out), f"disclosure{i}.txt"); open(tf, "w").write(t)
    draw.append(f"drawtext=fontfile={FONT}:textfile={tf}:fontcolor=0x55625a:fontsize=20:x=(w-text_w)/2:y={640 + i * 32}:enable='gte(t,{CARD_AT})'")
vf = f"[0:v]tpad=stop_mode=clone:stop_duration={EXTRA}," + ",".join(draw) + "[v]"
ins = ["-i", src]
af = []
for i, s in enumerate(scenes):
    ins += ["-i", os.path.join(vdir, s["id"] + ".wav")]
    ms = int(s["at"] * 1000)
    af.append(f"[{i + 1}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{i}]")
ins += ["-i", music]
m = len(scenes) + 1
af.append("".join(f"[a{i}]" for i in range(len(scenes))) + f"amix=inputs={len(scenes)}:normalize=0,apad,atrim=duration={total:.2f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100,asplit=2[vo][key]")
af.append(f"[{m}:a]atrim=duration={total:.2f},volume=-17dB[mu]")
af.append("[mu][key]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=600[duck]")
af.append("[vo][duck]amix=inputs=2:normalize=0,alimiter=limit=0.84,volume=-1.5dB[a]")
cmd = ["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join([vf] + af), "-map", "[v]", "-map", "[a]",
       "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
       "-t", f"{total:.2f}", "-movflags", "+faststart", out]
subprocess.check_call(cmd)
print("wrote", out, round(dur(out), 2), "s")
