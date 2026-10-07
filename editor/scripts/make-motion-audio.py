#!/usr/bin/env python3
"""Banda sonora del anuncio en motion graphics (MotionPromo), sincronizada con src/motion/timeline.json.

Música alegre a 120 BPM (do mayor: C–G–Am–F) con marimba, bajo saltarín, palmas y efectos de dibujos
(pops, boings, barridos). El tramo del problema cambia a menor y se apaga. Todo sintetizado, sin samples.
Uso: python3 scripts/make-motion-audio.py  ->  public/audio/motion-promo.wav
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/motion/timeline.json").read_text())
SR = 44100
FPS = TL["fps"]
BEAT = 60 / TL["bpm"]
BAR = 4 * BEAT
rng = np.random.default_rng(7)

starts, t0 = {}, 0
for s in TL["scenes"]:
    starts[s["id"]] = t0
    t0 += s["duration"]
TOTAL = t0 / FPS
N = int((TOTAL + 0.3) * SR)
C = TL["cues"]


def at(scene, local):
    return (starts[scene] + local) / FPS


music = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32)
send = np.zeros((N, 2), np.float32)


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def place(buf, t, sig, gain=1.0, pan=0.0, rev=0.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(sig), 0] += sig * gain * l * 1.414
    buf[i : i + len(sig), 1] += sig * gain * r * 1.414
    if rev:
        send[i : i + len(sig), 0] += sig * gain * rev * l
        send[i : i + len(sig), 1] += sig * gain * rev * r


def note(n):
    return 440 * 2 ** ((n - 69) / 12)


def saw(f, t):
    dt = f / SR
    ph = (f * t) % 1
    out = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt
    out[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    out[m] -= x * x + x + x + 1
    return out


def sweep(f0, f1, d, curve=1.0):
    t = tt(d)
    f = f0 + (f1 - f0) * (t / d) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------- instrumentos ----------
def kick(punch=1.0):
    t = tt(0.4)
    f = 48 + 120 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14)
    click = hp(rng.normal(0, 1, len(t)), 3500) * np.exp(-t / 0.003) * 0.35 * punch
    return np.tanh((body + click) * 1.5)


def clap():
    t = tt(0.28)
    n = bp(rng.normal(0, 1, len(t)), 1000, 3500)
    env = sum(np.where(t >= d, np.exp(-(t - d) / (0.01 if k < 2 else 0.08)), 0) for k, d in enumerate([0, 0.01, 0.021]))
    return n * env * 0.75


def snap():
    t = tt(0.08)
    return bp(rng.normal(0, 1, len(t)), 1800, 5200) * np.exp(-t / 0.012) * 0.9


def hat(open_=False):
    t = tt(0.22 if open_ else 0.05)
    return hp(rng.normal(0, 1, len(t)), 8000, 4) * np.exp(-t / (0.07 if open_ else 0.014)) * 0.5


def shaker():
    t = tt(0.07)
    return bp(rng.normal(0, 1, len(t)), 5000, 11000) * np.sin(np.pi * t / 0.07) ** 2 * 0.4


def marimba(f, d=0.5):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)
    s += 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / 0.008)
    return s * np.minimum(1, t / 0.002)


def bass(f, d):
    t = tt(d)
    s = 0.7 * np.sin(2 * np.pi * f * t) + 0.3 * lp(saw(f, t), 700)
    return s * np.minimum(1, t / 0.004) * np.exp(-t / 0.18)


def pad(freqs, d, cutoff=1800):
    t = tt(d)
    s = sum(saw(f * (1 + dt), t) for f in freqs for dt in (-0.004, 0, 0.004)) / (3 * len(freqs))
    env = np.minimum(1, t / 0.15) * np.minimum(1, np.maximum(0, d - t) / 0.25)
    return lp(s, cutoff) * env


def bell(f, d=1.0):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (d * 0.35 / r**0.5)) for r, a in ((1, 1), (2.76, 0.45), (5.4, 0.2)))


def pop(f0=900, f1=300, d=0.09):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.018)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.028)


def boing(f0, d=0.32):
    t = tt(d)
    f = f0 * (1 + 0.35 * np.exp(-t / 0.05) * np.cos(2 * np.pi * 14 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def pew(f0, f1, d=0.35):
    return sweep(f0, f1, d, 0.6) * np.exp(-tt(d) / (d * 0.5))


def whoosh(d=0.4, up=True):
    t = tt(d)
    n = rng.normal(0, 1, len(t))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    mix = (t / d) if up else (1 - t / d)
    return (bp(n, 300, 1500) * (1 - mix) + bp(n, 2000, 7500) * mix) * env


def riser(d, f0=220, octaves=3):
    t = tt(d)
    n = hp(rng.normal(0, 1, len(t)), 1800) * (t / d) ** 2.4 * 0.5
    return n + sweep(f0, f0 * 2**octaves, d, 1.0) * (t / d) ** 2 * 0.3


def knock():
    t = tt(0.18)
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.03) + 0.5 * np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.015)
    return body + bp(rng.normal(0, 1, len(t)), 800, 3000) * np.exp(-t / 0.006) * 0.4


def click():
    t = tt(0.03)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.005)


def boom():
    t = tt(1.0)
    f = 40 + 70 * np.exp(-t / 0.06)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35) * 1.6)


# ---------- MÚSICA ----------
CHORDS = {"C": [60, 64, 67], "G": [59, 62, 67], "Am": [57, 60, 64], "F": [57, 60, 65], "Em": [59, 64, 67]}
ROOT_N = {"C": 36, "G": 43, "Am": 45, "F": 41, "Em": 40}
PROG = ["C", "G", "Am", "F"]
RIFF = [(0, 3), (3, 2), (6, 1), (8, 2), (10, 3), (12, 4), (14, 2)]  # (semicorchea, nota del acorde)

problem0, problem1 = at("problem", 0), at("reveal", 0)
how_break0, how_break1 = at("how", 0), at("how", C["how"]["tap"])
end_hit = 16 * BAR  # 32 s: acorde final
sidechain = np.ones(N, np.float32)

for b in range(17):
    bt = b * BAR
    if bt >= TOTAL:
        break
    in_problem = problem0 <= bt < problem1
    in_break = how_break0 <= bt < how_break1
    final = bt >= end_hit
    name = (["Am", "Em"][b % 2]) if in_problem else PROG[b % 4]
    chord, root = CHORDS[name], ROOT_N[name]
    tones = chord + [chord[0] + 12, chord[1] + 12]

    if final:
        place(music, bt, pad([note(n) for n in CHORDS["C"] + [72, 76]], TOTAL - bt + 0.2, 2400), 0.55, rev=0.5)
        place(music, bt, kick(), 0.9)
        place(music, bt, clap(), 0.4, rev=0.4)
        for k, n in enumerate([72, 76, 79, 84]):
            place(music, bt + k * 0.04, marimba(note(n), 1.2), 0.35, pan=-0.3 + k * 0.2, rev=0.4)
        place(music, bt, bass(note(36), 1.4), 0.6)
        continue

    if in_problem:
        # Tramo triste: menor, filtrado, solo un latido y un tic-tac.
        place(music, bt, pad([note(n - 12) for n in chord], BAR + 0.05, 650), 0.5, rev=0.3)
        place(music, bt, kick(0.3), 0.45)
        for k in range(8):
            place(music, bt + k * BEAT / 2, click(), 0.08 if k % 2 else 0.12, pan=0.3 if k % 2 else -0.3)
        continue

    place(music, bt, pad([note(n) for n in chord], BAR + 0.05, 1200 if in_break else 1700), 0.28, rev=0.3)
    for k in range(4):
        kt = bt + k * BEAT
        if not in_break or k == 0:
            place(music, kt, kick(), 0.85 if not in_break else 0.5)
            i0 = int(kt * SR)
            dip = 1 - 0.45 * np.exp(-np.arange(int(0.2 * SR)) / SR / 0.06)
            sidechain[i0 : i0 + len(dip)] = np.minimum(sidechain[i0 : i0 + len(dip)], dip[: max(0, N - i0)])
        if in_break:
            continue
        if k in (1, 3):
            place(music, kt, clap(), 0.5, rev=0.2)
        place(music, kt + BEAT / 2, hat(open_=k == 3), 0.16, pan=0.25)
        place(music, kt + BEAT / 4, hat(), 0.08, pan=-0.25)
        place(music, kt + 3 * BEAT / 4, hat(), 0.08, pan=-0.25)
        if b < 2:
            place(music, kt + BEAT / 2, snap(), 0.35, pan=-0.2)
        if at("benefits", 0) <= bt < at("cta", 0):
            for s16 in range(4):
                place(music, kt + s16 * BEAT / 4, shaker(), 0.18 if s16 % 2 else 0.1, pan=0.4)
    # Bajo saltarín en corcheas con saltos de octava.
    for e in range(8):
        et = bt + e * BEAT / 2
        n = root + (12 if e in (3, 6) else 0)
        place(music, et, bass(note(n), BEAT / 2), 0.42 if not in_break else 0.25)
    # Marimba: el riff del anuncio.
    for s16, ti in RIFF:
        place(music, bt + s16 * BEAT / 4, marimba(note(tones[ti] + 12)), 0.22 if not in_break else 0.14, pan=0.3 if s16 % 4 else -0.3, rev=0.25)

# Subidas hacia los cambios de escena.
place(music, problem1 - 1.6, riser(1.6), 0.5, rev=0.3)
place(music, how_break1 - 1.5, riser(1.5, 330, 2), 0.35, rev=0.3)
music *= sidechain[:, None]

# ---------- EFECTOS ----------
h, pr, rv, hw, bn, ct = (C[k] for k in ("hook", "problem", "reveal", "how", "benefits", "cta"))

for k in range(4):
    place(sfx, at("hook", 3), whoosh(0.3, up=True), 0.12, pan=[-0.7, 0.7, -0.5, 0.5][k])
place(sfx, at("hook", h["collide"]), boom(), 0.55)
place(sfx, at("hook", h["collide"]), pop(1300, 400, 0.12), 0.5)
for k, n in enumerate([84, 88, 91]):
    place(sfx, at("hook", h["collide"]) + 0.03 + k * 0.035, bell(note(n), 0.8), 0.1, rev=0.5)
for i, w in enumerate(h["words"]):
    place(sfx, at("hook", w), pop(700 + i * 90, 260), 0.3, pan=-0.2 + i * 0.2)
place(sfx, at("hook", h["highlight"] + 4), whoosh(0.25), 0.25, pan=0.3)
for i in range(5):
    place(sfx, at("hook", h["split"] + 2 + abs(i - 2) * 2), pop(900 + i * 120, 400, 0.08), 0.22, pan=(i - 2) * 0.3)
for k, w in enumerate(h["wave"]):
    place(sfx, at("hook", w), boing(note(72 + [0, 4, 7][k])), 0.22, rev=0.2)
for s in h["sparkles"]:
    place(sfx, at("hook", s), bell(note(96), 0.5), 0.06, rev=0.5)

# Iris hacia el tramo oscuro.
place(sfx, at("problem", -10), whoosh(0.35, up=False), 0.4)
place(sfx, at("problem", pr["drain"]), sweep(600, 200, 0.5) * np.exp(-tt(0.5) / 0.2), 0.12)
place(sfx, at("problem", pr["line1"]), pop(500, 200), 0.2)
place(sfx, at("problem", pr["line2"]), pop(560, 220), 0.2)
place(sfx, at("problem", pr["squiggle"]), whoosh(0.3), 0.18)
for i, f in enumerate(pr["falls"]):
    place(sfx, at("problem", f + 6), pew(1100 - i * 90, 220 - i * 15, 0.42), 0.16, pan=(i - 2) * 0.35)
place(sfx, at("problem", pr["bubble"]), pop(700, 300, 0.1), 0.35)
for k in range(5):
    place(sfx, at("problem", pr["typing"][0]) + k * 0.13, click(), 0.12)
place(sfx, at("problem", pr["deflate"]), sweep(520, 140, 0.5, 0.7) * np.exp(-tt(0.5) / 0.25), 0.22)

# Cortinilla de colores y tarjeta.
wave0 = at("reveal", 0) - TL["overlays"]["wave"] / 2 / FPS
place(sfx, wave0, whoosh(0.6, up=True), 0.55, pan=-0.4)
place(sfx, wave0 + 0.6, whoosh(0.6, up=False), 0.4, pan=0.4)
place(sfx, at("reveal", rv["card"]), boom(), 0.6)
place(sfx, at("reveal", rv["card"]), pop(1000, 300, 0.12), 0.45)
for i, e in enumerate(rv["echo"]):
    place(sfx, at("reveal", e), pop(600 + i * 150, 250, 0.08), 0.22, pan=0.3)
for s in rv["sparkles"]:
    place(sfx, at("reveal", s), bell(note(98), 0.5), 0.06, rev=0.5)
place(sfx, at("reveal", rv["title"]), pop(760, 280), 0.3)
place(sfx, at("reveal", rv["sub"]), pop(880, 300), 0.3)
for k, u in enumerate(rv["underline"]):
    place(sfx, at("reveal", u), marimba(note(84 + [0, 4, 7, 12][k]), 0.4), 0.18, rev=0.3)
for f in (rv["flipOut"], rv["flipBack"]):
    place(sfx, at("reveal", f), whoosh(0.3), 0.3)
    place(sfx, at("reveal", f + 8), pop(500, 200, 0.07), 0.25)
place(sfx, at("reveal", rv["flipOut"] + 12), bell(note(88), 0.9), 0.12, rev=0.5)
place(sfx, at("reveal", rv["exit"]), whoosh(0.5, up=False), 0.35)

# Cómo funciona.
place(sfx, at("how", hw["title"]), pop(700, 260), 0.25)
for k in range(3):
    place(sfx, at("how", hw["chips"] + k * 3), pop(900 + k * 150, 400, 0.07), 0.18)
place(sfx, at("how", hw["phoneIn"][0]), whoosh(0.7, up=False), 0.35, pan=0.5)
place(sfx, at("how", hw["tap"]), knock(), 0.6)
for k, r in enumerate(hw["rings"]):
    place(sfx, at("how", r), bell(note([84, 88, 91][k]), 1.0), 0.16, rev=0.5)
place(sfx, at("how", hw["lift"]), whoosh(0.4, up=True), 0.3)
place(sfx, at("how", hw["chip2"]), pop(820, 320, 0.08), 0.22)
for k, s in enumerate(hw["stars"]):
    place(sfx, at("how", s), marimba(note(84 + [0, 2, 4, 7, 9][k]), 0.5), 0.3, rev=0.3)
    place(sfx, at("how", s), pop(1200 + k * 100, 500, 0.06), 0.12)
for fr in range(hw["stars"][4] + 4, hw["press"] - 2, 2):
    place(sfx, at("how", fr), click(), 0.06, pan=rng.random() * 0.4 - 0.2)
place(sfx, at("how", hw["chip3"]), pop(900, 340, 0.08), 0.22)
place(sfx, at("how", hw["press"]), click(), 0.35)
for k, n in enumerate([84, 88, 91, 96]):
    place(sfx, at("how", hw["check"]) + k * 0.06, bell(note(n), 1.1), 0.16, rev=0.5)
for k in range(14):
    place(sfx, at("how", hw["confetti"]) + rng.random() * 0.35, pop(1400 + rng.random() * 1600, 600, 0.05), 0.1, pan=rng.random() * 1.6 - 0.8)
place(sfx, at("how", hw["caption"]), pop(640, 260), 0.2)
place(sfx, at("how", hw["cover"]), whoosh(0.6, up=True), 0.45)

# Ventajas: un barrido y un "pop" por panel; la rejilla y la recogida.
for k, p in enumerate(bn["panels"]):
    if k:
        place(sfx, at("benefits", p) - 0.05, whoosh(0.3), 0.4, pan=[0, 0.6, 0, -0.6][k])
    place(sfx, at("benefits", p + 6), pop(700 + k * 100, 260, 0.1), 0.3)
    place(sfx, at("benefits", p + 4), sweep(900, 1800, 0.25) * np.exp(-tt(0.25) / 0.12), 0.06)
place(sfx, at("benefits", bn["grid"]), whoosh(0.35, up=False), 0.35)
for k, tile in enumerate(bn["tiles"]):
    place(sfx, at("benefits", tile), boing(note(76 + k * 3), 0.25), 0.18)
place(sfx, at("benefits", bn["collapse"]), sweep(1600, 400, 0.6, 0.5) * np.exp(-tt(0.6) / 0.3), 0.15)

# Cierre.
place(sfx, at("cta", 0), riser(ct["merge"] / FPS, 440, 2), 0.45)
place(sfx, at("cta", ct["merge"]), boom(), 0.55)
place(sfx, at("cta", ct["card"]), pop(1000, 300, 0.12), 0.45)
place(sfx, at("cta", ct["line1"]), pop(700, 260), 0.3)
place(sfx, at("cta", ct["line2"]), pop(860, 300), 0.3)
for k, n in enumerate([79, 84, 88]):
    place(sfx, at("cta", ct["logo"]) + k * 0.05, bell(note(n), 1.0), 0.12, rev=0.5)
place(sfx, at("cta", ct["button"]), boing(note(67), 0.35), 0.3)
for p in ct["pulses"][:3]:
    place(sfx, at("cta", p), click(), 0.12)
for k, n in enumerate([84, 88, 91, 96]):
    place(sfx, at("cta", ct["ding"]) + k * 0.07, bell(note(n), 1.6), 0.13, rev=0.6)

# ---------- MEZCLA ----------
ir_t = tt(1.4)
ir = rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t / 0.38)[:, None]
ir[:, 0], ir[:, 1] = lp(ir[:, 0], 6500), lp(ir[:, 1], 6500)
ir /= np.sqrt((ir**2).sum(axis=0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], axis=1) * 0.45

mix = music * 0.85 + sfx + wet
tline = np.arange(N) / SR
mix *= np.clip((TOTAL - tline) / 1.6, 0, 1)[:, None] ** 0.8
mix *= np.minimum(1, tline / 0.01)[:, None]
mix = np.stack([lp(hp(mix[:, ch], 30), 15000, 1) for ch in range(2)], axis=1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix /= np.max(np.abs(mix)) / 0.89
mix = mix[: int(TOTAL * SR)]
out = ROOT / "public/audio/motion-promo.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"{out.relative_to(ROOT)}  {TOTAL:.2f}s  escenas={ {k: round(v / FPS, 2) for k, v in starts.items()} }")
