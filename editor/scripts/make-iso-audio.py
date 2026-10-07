#!/usr/bin/env python3
"""Banda sonora lo-fi del diorama isométrico (IsoPromo), sincronizada con src/iso/timeline.json.

90 BPM con swing: piano eléctrico (Fmaj7 – Em7 – Dm7 – Cmaj7), bajo redondo, batería apagada y crujido de vinilo.
Pájaros por la mañana, grillos por la noche y una campanita por cada reseña. Uso: python3 scripts/make-iso-audio.py
"""
import json

import numpy as np

from synth import ROOT, Mix, bp, hp, lp, note, tt

TL = json.loads((ROOT / "src/iso/timeline.json").read_text())
FPS = TL["fps"]
TOTAL = TL["duration"] / FPS
BEAT = 60 / TL["bpm"]
BAR = 4 * BEAT
S16 = BEAT / 4
SWING = 0.18 * S16
mix = Mix(TOTAL, seed=33)
rng = mix.rng


def rhodes(f, d, wobble=0.004):
    t = tt(d)
    vib = 1 + wobble * np.sin(2 * np.pi * 0.7 * t)
    ph = 2 * np.pi * f * np.cumsum(vib) / 44100
    mod = np.sin(ph * 14) * np.exp(-t / 0.05) * 0.8
    s = np.sin(ph + mod) * np.exp(-t / 1.6) + 0.3 * np.sin(2 * ph) * np.exp(-t / 0.6)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return lp(s * trem, 2600) * np.minimum(1, t / 0.006) * np.minimum(1, np.maximum(0, d - t) / 0.2)


def kick():
    t = tt(0.3)
    f = 45 + 70 * np.exp(-t / 0.03)
    return lp(np.sin(2 * np.pi * np.cumsum(f) / 44100) * np.exp(-t / 0.15), 900)


def snare():
    t = tt(0.25)
    n = bp(rng.normal(0, 1, len(t)), 900, 4500) * np.exp(-t / 0.07)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) * 0.5
    return lp(n * 0.7 + body, 4000)


def hat(open_=False):
    t = tt(0.18 if open_ else 0.05)
    return lp(hp(rng.normal(0, 1, len(t)), 6000, 4), 9000) * np.exp(-t / (0.06 if open_ else 0.013)) * 0.4


def bass(f, d):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t / 0.9) * np.minimum(1, np.maximum(0, d - t) / 0.05)


def bell(f, d=1.2):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (d * 0.3 / r**0.5)) for r, a in ((1, 1), (2.76, 0.4), (5.4, 0.15)))


def chirp(f0):
    d = 0.09
    t = tt(d)
    f = f0 * (1 + 0.35 * np.sin(np.pi * t / d))
    return np.sin(2 * np.pi * np.cumsum(f) / 44100) * np.sin(np.pi * t / d) ** 2


def cricket():
    d = 0.35
    t = tt(d)
    gate = (np.sin(2 * np.pi * 28 * t) > 0.3).astype(float)
    return np.sin(2 * np.pi * 4300 * t) * gate * np.sin(np.pi * t / d)


# ---------- MÚSICA ----------
CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]  # Fmaj7, Em7, Dm7, Cmaj7
ROOTS = [41, 40, 38, 36]
n_bars = int(np.ceil(TOTAL / BAR))
for b in range(n_bars):
    bt = b * BAR
    chord, root = CHORDS[b % 4], ROOTS[b % 4]
    last = b == n_bars - 1
    if last:
        chord, root = [48, 52, 55, 59, 62], 36
    # Piano: acorde arpegiado suave al principio del compás y un golpe a contratiempo.
    for k, n in enumerate(chord):
        mix.m(bt + k * 0.025, rhodes(note(n), BAR * (1.4 if last else 1.0)), 0.16, pan=-0.2 + k * 0.12, rev=0.3)
    if not last:
        for k, n in enumerate(chord[1:]):
            mix.m(bt + 2.5 * BEAT + SWING + k * 0.02, rhodes(note(n + 12), BEAT), 0.06, pan=0.3, rev=0.4)
        mix.m(bt, bass(note(root), 1.5 * BEAT), 0.5)
        mix.m(bt + 1.5 * BEAT + SWING, bass(note(root), 0.5 * BEAT), 0.35)
        mix.m(bt + 2.5 * BEAT, bass(note(root + 7), BEAT), 0.4)
    else:
        mix.m(bt, bass(note(root), BAR), 0.5)
    if b == 0 or last:
        continue
    for s16 in range(16):
        st = bt + s16 * S16 + (SWING if s16 % 2 else 0)
        if s16 in (0, 7, 10):
            mix.m(st, kick(), 0.7)
        if s16 in (4, 12):
            mix.m(st, snare(), 0.45, rev=0.25)
        if s16 % 2 == 0:
            mix.m(st, hat(open_=s16 == 14), 0.13 if s16 % 4 else 0.18, pan=0.25)
        elif rng.random() < 0.35:
            mix.m(st, hat(), 0.06, pan=0.3)

# Primer compás: solo piano y vinilo mientras la cámara se abre (filtrado y volviéndose más claro).
first = int(BAR * 44100)
ramp_lp = np.linspace(0.35, 1.0, first)
mix.music[:first] *= ramp_lp[:, None]

# Vinilo: siseo continuo y chasquidos sueltos.
n = mix.n
hiss = lp(hp(rng.normal(0, 1, n), 3000), 9000) * 0.015
crackle = np.zeros(n)
pops = rng.integers(0, n - 200, int(TOTAL * 9))
for p in pops:
    crackle[p : p + 30] += rng.normal(0, 1, 30) * np.exp(-np.arange(30) / 6) * (0.05 + rng.random() * 0.15)
mix.music[:, 0] += hiss + crackle
mix.music[:, 1] += np.roll(hiss, 300) + np.roll(crackle, 150)

# ---------- AMBIENTE Y EFECTOS ----------
hours = TL["hours"]
hour_to_t = lambda h: (h - hours[0]) / (hours[1] - hours[0]) * TOTAL  # noqa: E731
for k in range(14):
    t = 0.3 + rng.random() * (hour_to_t(10.5) - 0.3)
    for j in range(rng.integers(2, 4)):
        mix.s(t + j * 0.11, chirp(2600 + rng.random() * 1400), 0.05, pan=rng.random() * 1.4 - 0.7, rev=0.3)
t = hour_to_t(19.6)
while t < TOTAL - 0.3:
    mix.s(t, cricket(), 0.025, pan=rng.random() * 1.4 - 0.7)
    t += 0.5 + rng.random() * 0.4

walk, tap_after, flight = TL["walk"], TL["tapAfter"], TL["flight"]
for i, c in enumerate(TL["customers"]):
    tap = (c["at"] + walk + tap_after) / FPS
    arrive = tap + flight / FPS
    mix.s(tap, bell(note(84), 0.8), 0.1, rev=0.4)
    mix.s(tap + 0.07, bell(note(91), 0.7), 0.07, rev=0.4)
    for k in range(6):
        mix.s(tap + 0.1 + k * flight / FPS / 7, bell(note(96 + k), 0.25), 0.025, pan=-0.3 + k * 0.1, rev=0.5)
    mix.s(arrive, bell(note([79, 81, 84, 86, 88][i]), 1.6), 0.14, rev=0.5)

out = mix.render("public/audio/iso-promo.wav", music_gain=0.9, reverb_time=0.6, reverb_gain=0.45, fade_out=2.2, drive=1.05, lowpass=11000)
print(f"{out.name}  {TOTAL:.2f}s  compás {BAR:.3f}s")
