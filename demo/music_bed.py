# Generates the music bed from nothing but sine waves and noise-free envelopes (no samples, no third-party audio).
# Usage: python music_bed.py <out.wav> <seconds>
import sys, numpy as np, soundfile as sf
out, secs = sys.argv[1], float(sys.argv[2])
sr = 44100
n = int(sr * secs)
t = np.arange(n) / sr
def note(m): return 440.0 * 2 ** ((m - 69) / 12)
# Slow four-chord loop, 8 s per chord: Dmaj9, Bm7, Gmaj7, A6 (MIDI notes)
chords = [[50, 57, 62, 66, 69, 76], [47, 54, 59, 62, 66, 69], [43, 55, 59, 62, 66, 74], [45, 57, 61, 64, 66, 73]]
bar = 8.0
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)
for i in range(int(secs / bar) + 1):
    ch = chords[i % 4]
    s0 = int(i * bar * sr); s1 = min(n, int((i * bar + bar + 3.0) * sr))
    if s0 >= n: break
    tt = np.arange(s1 - s0) / sr
    env = np.minimum(1, tt / 2.5) * np.minimum(1, np.maximum(0, (bar + 3.0 - tt) / 3.0))  # 2.5 s in, 3 s overlap out
    for j, m in enumerate(ch):
        f = note(m)
        det = 1 + (rng.random() - 0.5) * 0.004
        ph = rng.random() * 6.283
        w = np.sin(2 * np.pi * f * tt + ph) + 0.35 * np.sin(2 * np.pi * f * det * 2 * tt) + 0.12 * np.sin(2 * np.pi * f * 3 * tt + ph)
        trem = 1 + 0.12 * np.sin(2 * np.pi * (0.11 + 0.03 * j) * tt + ph)
        amp = (0.55 if j == 0 else 0.3) / (1 + j * 0.15)
        pan = 0.5 + 0.35 * np.sin(j * 1.7)
        L[s0:s1] += w * env * trem * amp * (1 - pan); R[s0:s1] += w * env * trem * amp * pan
    # one soft bell-like note per bar (top chord tone, an octave up), decaying
    b0 = s0 + int(4.0 * sr)
    if b0 < n:
        b1 = min(n, b0 + int(5 * sr)); tb = np.arange(b1 - b0) / sr
        bell = np.sin(2 * np.pi * note(ch[-1] + 12) * tb) * np.exp(-tb * 1.1) * 0.18
        L[b0:b1] += bell * 0.6; R[b0:b1] += bell * 0.4
x = np.stack([L, R], 1)
x /= np.max(np.abs(x)) * 1.25
fade = int(3 * sr)
x[:fade] *= np.linspace(0, 1, fade)[:, None]; x[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(out, x.astype(np.float32), sr)
print("wrote", out, round(secs, 1), "s")
