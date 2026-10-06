#!/usr/bin/env python3
"""Sintetiza la banda sonora completa (música + efectos) sincronizada con src/timeline.json.

No usa samples: todo se genera con osciladores, ruido filtrado y envolventes.
Uso: python3 scripts/make-audio.py  ->  public/audio/nfc-promo.wav
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/timeline.json").read_text())
SR = 44100
FPS = TL["fps"]
BEAT = 60 / TL["bpm"]
rng = np.random.default_rng(42)

# ---------- línea de tiempo (misma lógica que src/theme.ts) ----------
starts, start = {}, 0
for i, s in enumerate(TL["scenes"]):
    starts[s["id"]] = start
    end = start + s["duration"]
    j = TL["joins"][i] if i < len(TL["joins"]) else None
    start = end - j["duration"] if j and j["type"] == "transition" else end
TOTAL_FRAMES = end
DUR = TOTAL_FRAMES / FPS + 0.2
N = int(DUR * SR)
C = TL["cues"]


def at(scene, local):
    return (starts[scene] + local) / FPS


DROP = starts["reveal"] / FPS  # 6.5 s: la rejilla de compases se alinea con el drop
END_GROOVE = at("cta", C["cta"]["fadeOut"])

music = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32)
send = np.zeros((N, 2), np.float32)  # envío a reverb


# ---------- utilidades DSP ----------
def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def place(buf, t0, sig, gain=1.0, pan=0.0, rev=0.0):
    i = int(t0 * SR)
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


def saw(f, t, detune=0.0):
    # Sierra PolyBLEP: elimina el aliasing de la sierra "ingenua".
    fr = f * (1 + detune)
    dt = fr / SR
    ph = (fr * t) % 1
    out = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt
    out[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    out[m] -= x * x + x + x + 1
    return out


# ---------- instrumentos ----------
def kick():
    t = tt(0.45)
    f = 45 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    click = hp(rng.normal(0, 1, len(t)), 3000) * np.exp(-t / 0.004) * 0.4
    return np.tanh((body + click) * 1.6)


def clap():
    t = tt(0.3)
    n = bp(rng.normal(0, 1, len(t)), 900, 3200)
    env = np.zeros_like(t)
    for k, d in enumerate([0, 0.011, 0.022]):
        env += np.where(t >= d, np.exp(-(t - d) / (0.012 if k < 2 else 0.09)), 0)
    return n * env * 0.7


def hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    return hp(rng.normal(0, 1, len(t)), 7500, 4) * np.exp(-t / (0.08 if open_ else 0.018)) * 0.5


def pluck(f, d=0.35):
    t = tt(d)
    s = saw(f, t) * 0.6 + saw(f * 2, t) * 0.2
    return lp(s, 3500) * np.exp(-t / 0.09)


def bass_note(f, d):
    t = tt(d)
    s = saw(f, t) + 0.5 * np.sin(2 * np.pi * f / 2 * t)
    env = np.minimum(1, t / 0.005) * np.exp(-t / 0.25)
    return lp(s, 420) * env


def pad(freqs, d):
    t = tt(d)
    s = sum(saw(f, t, dt) for f in freqs for dt in (-0.004, 0, 0.0045)) / (3 * len(freqs))
    env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    return lp(s, 1600) * env


def bell(f, d=1.2, partials=((1, 1), (2.76, 0.45), (5.4, 0.2), (8.9, 0.08))):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (d * 0.35 / r**0.5)) for r, a in partials)


def whoosh(d=0.45, up=True):
    t = tt(d)
    n = rng.normal(0, 1, len(t))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    lo = bp(n, 300, 1400)
    hi = bp(n, 1800, 7000)
    mix = (t / d) if up else (1 - t / d)
    return (lo * (1 - mix) + hi * mix) * env


def riser(d):
    t = tt(d)
    n = hp(rng.normal(0, 1, len(t)), 1500) * (t / d) ** 2.2
    f = 220 * 2 ** (3 * t / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 2 * 0.35
    return n * 0.5 + tone


def impact():
    t = tt(2.0)
    f = 30 + 60 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    crash = lp(rng.normal(0, 1, len(t)), 5000) * np.exp(-t / 0.35) * 0.45
    return np.tanh((sub + crash) * 1.5)


def pop(f0=900, f1=300, d=0.09):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03)


def tick(f=2200, d=0.025):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006)


def glitch(d=0.3):
    t = tt(d)
    sq = np.sign(np.sin(2 * np.pi * 180 * t * (1 + 3 * rng.random())))
    n = rng.normal(0, 1, len(t))
    gate = (rng.random(int(d * 60)) > 0.4).repeat(len(t) // int(d * 60) + 1)[: len(t)]
    crushed = np.round((sq * 0.5 + n * 0.5) * 4) / 4
    return crushed * gate * 0.6


def buzz(d=0.35):
    t = tt(d)
    s = np.sign(np.sin(2 * np.pi * 98 * t)) * 0.6 + saw(103, t) * 0.4
    return np.tanh(lp(s, 900) * 2) * np.exp(-t / 0.18)


def thud():
    t = tt(0.5)
    f = 60 + 90 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)


# ---------- MÚSICA ----------
# Am – F – C – G, un acorde por compás, con la rejilla alineada al drop.
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
ROOTS = [45, 41, 36, 43]
BAR = 4 * BEAT
first_bar = DROP - BAR * int(DROP / BAR + 1)

# Intro oscura: pad grave filtrado + pulso sub (corazón) hasta el drop.
place(music, 0, pad([note(n - 12) for n in CHORDS[0]], DROP + 0.2), 0.55)
for b in np.arange(0, DROP - 0.1, BEAT * 2):
    place(music, b, thud(), 0.5)
# Tic-tac de reloj durante la pregunta.
q0 = at("question", C["question"]["clockStart"])
for b in np.arange(q0, DROP - 0.05, BEAT / 2):
    place(music, b, tick(3000 if int((b - q0) / (BEAT / 2)) % 2 == 0 else 2400), 0.35, pan=0.3)
rs = at("question", C["question"]["riserStart"])
place(music, rs, riser(DROP - rs), 0.6, rev=0.3)

# Groove principal del drop al final, con un tramo "breakdown" (más íntimo) durante los detalles macro.
BREAK0 = at("details", 0) + 0.4
BREAK1 = starts["photo"] / FPS
sidechain = np.ones(N, np.float32)
bar_t = DROP
bar_idx = 0
while bar_t < END_GROOVE + 0.01:
    chord = CHORDS[bar_idx % 4]
    root = ROOTS[bar_idx % 4]
    breakdown = BREAK0 <= bar_t < BREAK1
    place(music, bar_t, pad([note(n) for n in chord] + [note(chord[0] + 12)], BAR + 0.05), 0.5 if breakdown else 0.42, rev=0.45 if breakdown else 0.25)
    for k in range(4):
        bt = bar_t + k * BEAT
        if bt >= END_GROOVE:
            break
        if breakdown and k != 0:
            continue
        place(music, bt, kick(), 0.6 if breakdown else 0.95)
        i0 = int(bt * SR)
        dip = 1 - 0.55 * np.exp(-np.arange(int(0.22 * SR)) / SR / 0.07)
        sidechain[i0 : i0 + len(dip)] = np.minimum(sidechain[i0 : i0 + len(dip)], dip[: max(0, N - i0)])
        if breakdown:
            continue
        if k in (1, 3) and bar_idx >= 1:
            place(music, bt, clap(), 0.55, rev=0.2)
        place(music, bt + BEAT / 2, hat(open_=True), 0.2, pan=0.25)
        if bar_idx >= 2:
            place(music, bt + BEAT / 4, hat(), 0.13, pan=-0.3)
            place(music, bt + 3 * BEAT / 4, hat(), 0.13, pan=-0.3)
        # Bajo en corcheas
        for e in range(2):
            place(music, bt + e * BEAT / 2, bass_note(note(root - 12 + (12 if e == 1 and k == 3 else 0)), BEAT / 2), 0.5)
    # Arpegio en semicorcheas con eco a partir del 2º compás
    if bar_idx >= 1:
        arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
        for s16 in range(16):
            stt = bar_t + s16 * BEAT / 4
            if stt >= END_GROOVE:
                break
            p = pluck(note(arp[s16 % 4]))
            place(music, stt, p, 0.16, pan=-0.4 if s16 % 2 else 0.4, rev=0.35)
            place(music, stt + 3 * BEAT / 4, p, 0.06, pan=0.4 if s16 % 2 else -0.4)
    bar_t += BAR
    bar_idx += 1

# Subida al final del breakdown: la música completa vuelve con la foto real.
place(music, BREAK1 - 2.0, riser(2.0), 0.55, rev=0.3)

# Acorde final largo que se apaga con el fundido.
place(music, at("cta", 0), pad([note(n) for n in [57, 60, 64, 69, 76]], (TOTAL_FRAMES - starts["cta"]) / FPS + 0.2), 0.5, rev=0.5)
music *= sidechain[:, None]

# ---------- EFECTOS ----------
h, q, rv, hw, rs_, ft, ct = (C[k] for k in ("hook", "question", "reveal", "how", "results", "features", "cta"))

for i, w in enumerate(h["words"]):
    place(sfx, at("hook", w), pop(700 + i * 40, 250), 0.35, pan=(-0.2 if i % 2 else 0.2))
place(sfx, at("hook", h["glitch"]), glitch(), 0.7, rev=0.2)
place(sfx, at("hook", h["strike"]), buzz(), 0.55)
place(sfx, at("hook", h["strike"]), thud(), 0.6)
place(sfx, at("hook", h["strike"] + 6), tick(1600, 0.06), 0.3)
place(sfx, at("question", -8), whoosh(0.35), 0.55, rev=0.2)

for i, w in enumerate(q["words"]):
    place(sfx, at("question", w), pop(800 + i * 60, 300), 0.32)
place(sfx, at("question", q["highlight"]), whoosh(0.25), 0.4, pan=-0.3)

place(sfx, at("reveal", rv["impact"]), impact(), 0.9, rev=0.4)
place(sfx, at("reveal", rv["impact"]), whoosh(rv["turnEnd"] / FPS, up=True), 0.5, pan=-0.3)
for k, f in enumerate([2093, 2637, 3136, 4186]):
    place(sfx, at("reveal", rv["turnEnd"] - 10) + k * 0.05, bell(f, 0.9), 0.08, pan=-0.5 + k * 0.33, rev=0.6)
for k in range(10):
    place(sfx, at("reveal", rv["title"] + k * 2), tick(1800 + k * 60, 0.02), 0.12)
place(sfx, at("reveal", rv["subtitle"]), whoosh(0.3), 0.3)
for k, f in enumerate([3136, 4186]):
    place(sfx, at("reveal", 128) + k * 0.06, bell(f, 0.8), 0.06, pan=0.4 - k * 0.6, rev=0.6)

# Detalles: cada movimiento de cámara es un "swoosh" suave; cada llegada, un brillo.
dt = C["details"]
moves = [(15, dt["stops"][0]["arrive"])] + [(dt["stops"][i]["leave"], dt["stops"][i + 1]["arrive"]) for i in range(3)] + [(dt["stops"][3]["leave"], 330)]
for i, (a, b) in enumerate(moves):
    place(sfx, at("details", a), whoosh((b - a) / FPS, up=i % 2 == 0), 0.32, pan=(-0.4 if i % 2 else 0.4), rev=0.3)
for i, st in enumerate(dt["stops"]):
    place(sfx, at("details", st["arrive"]), bell(note(88 + [0, 3, 7, 12][i]), 0.9), 0.07, rev=0.6)
    place(sfx, at("details", st["arrive"] - 4), pop(500, 220, 0.1), 0.18)
place(sfx, at("details", dt["ripples"]), bell(1318.5, 1.3), 0.26, rev=0.5)
place(sfx, at("details", dt["ripples"]) + 0.09, bell(1975.5, 1.1), 0.18, rev=0.5)
place(sfx, at("details", dt["stops"][3]["arrive"]), bell(note(100), 1.2, partials=((1, 1), (2.0, 0.5), (3.01, 0.25))), 0.08, rev=0.7)

# Foto real: golpe de vuelta al groove + "obturador" al aparecer la etiqueta.
ph = C["photo"]
place(sfx, at("photo", 0) - 0.12, whoosh(0.3), 0.6, pan=-0.6)
place(sfx, at("photo", 0), impact()[: int(0.9 * SR)], 0.55, rev=0.3)
place(sfx, at("photo", ph["tag"]), tick(1500, 0.03), 0.4)
place(sfx, at("photo", ph["tag"]) + 0.07, hp(rng.normal(0, 1, int(0.06 * SR)), 2000) * np.exp(-np.arange(int(0.06 * SR)) / SR / 0.015), 0.3)
place(sfx, at("photo", ph["title"]), whoosh(0.3), 0.3)
place(sfx, at("how", 0) - 0.15, whoosh(0.3), 0.6, pan=0.5)

place(sfx, at("how", hw["phoneIn"]), whoosh(0.5, up=False), 0.45)
place(sfx, at("how", hw["tap"]), thud(), 0.5)
place(sfx, at("how", hw["tap"]), bell(1318.5, 1.4), 0.32, rev=0.5)
place(sfx, at("how", hw["tap"]) + 0.09, bell(1975.5, 1.2), 0.22, rev=0.5)
place(sfx, at("how", hw["sheet"]), whoosh(0.22), 0.3)
place(sfx, at("how", hw["open"]) - 0.1, whoosh(0.35), 0.45)
for i, s in enumerate(hw["stars"]):
    place(sfx, at("how", s), pop(note(84 + [0, 2, 4, 7, 9][i]) * 1.0, note(84 + [0, 2, 4, 7, 9][i]) * 0.7, 0.12), 0.4)
    place(sfx, at("how", s), bell(note(96 + [0, 2, 4, 7, 9][i]), 0.4), 0.06, rev=0.4)
type_start = hw["stars"][4] + 8
for fr in range(type_start, hw["send"] - 4, 2):
    place(sfx, at("how", fr), tick(3500 + rng.random() * 800, 0.012), 0.12, pan=rng.random() * 0.4 - 0.2)
place(sfx, at("how", hw["send"]), tick(1200, 0.04), 0.4)
for k, n in enumerate([72, 76, 79, 84]):
    place(sfx, at("how", hw["check"]) + k * 0.07, bell(note(n + 12), 1.0), 0.18, rev=0.5)
for k in range(12):
    place(sfx, at("how", hw["confetti"]) + rng.random() * 0.4, pop(1500 + rng.random() * 1500, 600, 0.05), 0.12, pan=rng.random() * 1.6 - 0.8)
place(sfx, at("results", 0) - 0.15, whoosh(0.35), 0.5)

# Contador: los tics se aceleran y frenan siguiendo la curva del número.
ticks = np.linspace(0, 1, 26)
eased = ticks**2 * (3 - 2 * ticks)
for e in eased:
    place(sfx, at("results", rs_["countStart"] + e * (rs_["countEnd"] - rs_["countStart"])), tick(2600, 0.015), 0.16)
for k, n in enumerate([76, 81, 88]):
    place(sfx, at("results", rs_["countEnd"]) + k * 0.03, bell(note(n), 1.1), 0.12, rev=0.4)
for a in rs_["notifs"]:
    place(sfx, at("results", a), bell(note(81), 0.5), 0.14, rev=0.3)
    place(sfx, at("results", a) + 0.08, bell(note(88), 0.6), 0.12, rev=0.3)
place(sfx, at("features", 0) - 0.2, whoosh(0.3), 0.5)
place(sfx, at("features", 0), impact()[: int(0.6 * SR)], 0.4)

seg, ov = ft["segment"], ft["overlap"]
for k in range(1, 4):
    cut = k * (seg - ov) + ov / 2
    place(sfx, at("features", cut) - 0.12, whoosh(0.28), 0.45, pan=(-0.5 if k % 2 else 0.5))
for k in range(4):
    place(sfx, at("features", k * (seg - ov) + 4), pop(600, 200, 0.12), 0.25)

place(sfx, at("cta", ct["impact"]), impact(), 0.8, rev=0.4)
place(sfx, at("cta", 0), whoosh(ct["spinEnd"] / FPS, up=False), 0.4)
place(sfx, at("cta", ct["logo"]), bell(note(84), 1.0), 0.1, rev=0.5)
place(sfx, at("cta", ct["headline"]), pop(700, 260), 0.3)
place(sfx, at("cta", ct["headline"] + 8), pop(820, 300), 0.3)
place(sfx, at("cta", ct["button"]), pop(500, 180, 0.15), 0.45)
for k, n in enumerate([81, 84, 88, 93]):
    place(sfx, at("cta", ct["chime"]) + k * 0.06, bell(note(n), 1.3), 0.12, rev=0.6)

# ---------- MEZCLA ----------
ir_t = tt(1.6)
ir = rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t / 0.45)[:, None]
ir[:, 0], ir[:, 1] = lp(ir[:, 0], 6000), lp(ir[:, 1], 6000)
ir /= np.sqrt((ir**2).sum(axis=0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], axis=1) * 0.5

mix = music * 0.8 + sfx + wet
# Fundido final sincronizado con el fundido a negro de la última escena.
fade_t0, fade_t1 = END_GROOVE, TOTAL_FRAMES / FPS
tline = np.arange(N) / SR
mix *= np.clip((fade_t1 - tline) / (fade_t1 - fade_t0), 0, 1)[:, None] ** 0.7
mix *= np.minimum(1, tline / 0.03)[:, None]

# Limpieza del máster: fuera subgraves inútiles y el brillo más áspero.
mix = np.stack([lp(hp(mix[:, ch], 30), 14000, 1) for ch in range(2)], axis=1)
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix /= np.max(np.abs(mix)) / 0.89
out = ROOT / "public/audio/nfc-promo.wav"
out.parent.mkdir(parents=True, exist_ok=True)
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"{out.relative_to(ROOT)}  {DUR:.2f}s  drop={DROP:.2f}s  escenas={ {k: round(v / FPS, 2) for k, v in starts.items()} }")
