#!/usr/bin/env python3
"""Banda sonora minimal house del anuncio editorial (EditorialPromo), sincronizada con src/editorial/timeline.json.

120 BPM en la menor: bombo, palmas, charles, sub-bajo sincopado y acordes cortos con eco. Efectos de papel,
obturador y golpes secos para la maquetación. Uso: python3 scripts/make-editorial-audio.py
"""
import numpy as np

from synth import Mix, Timeline, bp, hp, lp, note, saw, tt

TL = Timeline("src/editorial/timeline.json")
C = TL.cues
BEAT = 60 / TL.data["bpm"]
BAR = 4 * BEAT
S16 = BEAT / 4
mix = Mix(TL.total, seed=21)
rng = mix.rng

GRID0 = TL.at("rule1")  # los compases arrancan con la regla 01
CLOSE = TL.at("close")


def kick():
    t = tt(0.35)
    f = 42 + 95 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / 44100) * np.exp(-t / 0.18)
    return np.tanh(body * 1.8) + hp(rng.normal(0, 1, len(t)), 4000) * np.exp(-t / 0.002) * 0.2


def clap():
    t = tt(0.3)
    n = bp(rng.normal(0, 1, len(t)), 1100, 4200)
    env = sum(np.where(t >= d, np.exp(-(t - d) / (0.008 if k < 2 else 0.11)), 0) for k, d in enumerate([0, 0.012, 0.024]))
    return n * env * 0.7


def hat(open_=False):
    t = tt(0.25 if open_ else 0.04)
    return hp(rng.normal(0, 1, len(t)), 9000, 4) * np.exp(-t / (0.09 if open_ else 0.01)) * 0.5


def rim():
    t = tt(0.06)
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + bp(rng.normal(0, 1, len(t)), 2000, 6000) * 0.4) * np.exp(-t / 0.012)


def sub(f, d):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(s * 1.4) * np.minimum(1, t / 0.005) * np.minimum(1, np.maximum(0, d - t) / 0.03)


def stab(notes, d=0.22, cutoff=2400):
    t = tt(d)
    s = sum(saw(note(n), t) + 0.6 * saw(note(n) * 1.005, t) for n in notes) / (1.6 * len(notes))
    return lp(s, cutoff) * np.exp(-t / 0.07)


def pad(notes, d, cutoff=900):
    t = tt(d)
    s = sum(saw(note(n) * k, t) for n in notes for k in (0.997, 1.003)) / (2 * len(notes))
    env = np.minimum(1, t / 0.6) * np.minimum(1, np.maximum(0, d - t) / 0.8)
    return lp(s, cutoff) * env


def echo(sig, delay, fb=0.45, taps=4):
    out = np.zeros(len(sig) + int(delay * 44100 * taps))
    for k in range(taps):
        i = int(delay * 44100 * k)
        out[i : i + len(sig)] += sig * fb**k
    return out


def paper(d=0.25):
    t = tt(d)
    n = rng.normal(0, 1, len(t))
    return bp(n, 1500, 7000) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5


def shutter():
    a = hp(rng.normal(0, 1, int(0.02 * 44100)), 3000) * np.exp(-tt(0.02) / 0.004)
    b = np.zeros(int(0.06 * 44100))
    c = hp(rng.normal(0, 1, int(0.03 * 44100)), 2500) * np.exp(-tt(0.03) / 0.006) * 0.7
    return np.concatenate([a, b, c])


def thump():
    t = tt(0.25)
    f = 60 + 40 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / 44100) * np.exp(-t / 0.09)


def swell(d):
    t = tt(d)
    return hp(rng.normal(0, 1, len(t)), 2500) * (t / d) ** 3


# ---------- MÚSICA ----------
CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [50, 53, 57, 60, 64], [52, 55, 59, 62]]  # Am9, Fmaj7, Dm9, Em7
ROOTS = [33, 29, 26, 28]
BASS_PAT = [0, 3, 6, 10, 12, 14]  # semicorcheas del compás donde suena el sub
STAB_PAT = [2, 7, 11]

# Intro (portada): charles, rim y acordes sin bombo.
for k in range(int(GRID0 / S16)):
    t = k * S16
    if k % 2 == 1:
        mix.m(t, hat(), 0.26, pan=0.25)
    if k % 8 == 5:
        mix.m(t, rim(), 0.3, pan=-0.3)
    if k % 8 == 0:
        mix.m(t, sub(note(33), S16 * 3), 0.35)
mix.m(0, pad(CHORDS[0], GRID0 + 0.4, 1300), 0.5, rev=0.4)
for s in STAB_PAT:
    mix.m(GRID0 - BAR + s * S16, echo(stab(CHORDS[0]), BEAT * 0.75), 0.18, pan=0.2, rev=0.3)
mix.m(GRID0 - BAR, swell(BAR), 0.25)

bar = 0
t = GRID0
while t < TL.total - 0.05:
    in_break = CLOSE <= t < CLOSE + BAR
    ci = (bar // 2) % 4 if t < CLOSE else 0
    chord, root = CHORDS[ci], ROOTS[ci]
    mix.m(t, pad(chord, BAR + 0.1, 700 if in_break else 1000), 0.22 if not in_break else 0.4, rev=0.4)
    for k in range(16):
        st = t + k * S16
        if st >= TL.total:
            break
        if in_break:
            continue
        if k % 4 == 0:
            mix.m(st, kick(), 0.9)
        if k in (4, 12):
            mix.m(st, clap(), 0.4, rev=0.25)
        if k % 4 == 2:
            mix.m(st, hat(open_=True), 0.16, pan=0.2)
        mix.m(st, hat(), 0.07 if k % 2 == 0 else 0.11, pan=-0.25)
        if k in (3, 9, 14):
            mix.m(st, rim(), 0.16, pan=0.35)
        if k in BASS_PAT:
            mix.m(st, sub(note(root + 12 * (k == 10)), S16 * 1.6), 0.5)
        if k in STAB_PAT:
            mix.m(st, echo(stab(chord), BEAT * 0.75), 0.15, pan=-0.2 if k == 7 else 0.2, rev=0.25)
    if in_break:
        mix.m(t, sub(note(root), BAR * 0.95), 0.35)
    t += BAR
    bar += 1

mix.m(CLOSE - BAR, swell(BAR), 0.35)

# ---------- EFECTOS ----------
cv = C["cover"]
mix.s(TL.at("cover", cv["kicker"]), paper(0.3), 0.18)
for t in cv["title"][:2]:
    mix.s(TL.at("cover", t), thump(), 0.35)
mix.s(TL.at("cover", cv["title"][2]), paper(0.35), 0.2)
mix.s(TL.at("cover", cv["title"][2] + 10), shutter(), 0.3)
mix.s(TL.at("cover", cv["out"]), paper(0.3), 0.18)

r = C["rule"]
for i, rid in enumerate(["rule1", "rule2", "rule3", "rule4"]):
    mix.s(TL.at(rid, r["numeral"]), thump(), 0.45)
    for h in r["headline"]:
        mix.s(TL.at(rid, h), rim(), 0.08)
    mix.s(TL.at(rid, r["figure"]), paper(0.35), 0.2, pan=0.5)
    mix.s(TL.at(rid, r["figure"] + 10), shutter(), 0.28, pan=0.5)
    if rid in ("rule2", "rule3"):
        for e in r["extra"]:
            mix.s(TL.at(rid, e), rim(), 0.12, pan=-0.2)
    if rid == "rule4":
        for k in range(14):
            mix.s(TL.at(rid, r["extra"][0] + k * 2.5), rim(), 0.06, pan=-0.4 + k * 0.06)
    if rid == "rule2":
        for k in range(3):
            mix.s(TL.at(rid, r["figure"] + 20 + k * 10), echo(np.sin(2 * np.pi * 1320 * tt(0.08)) * np.exp(-tt(0.08) / 0.03), 0.2, 0.35, 3), 0.05, rev=0.4)
    mix.s(TL.at(rid, r["out"]), paper(0.3), 0.16, pan=-0.3)

cl = C["close"]
mix.s(TL.at("close", cl["invert"]), thump(), 0.6)
mix.s(TL.at("close", cl["invert"]), paper(0.5), 0.25)
mix.s(TL.at("close", cl["line2"][1]), echo(stab(CHORDS[0], 0.4, 3000), BEAT * 0.75, 0.5, 5), 0.22, rev=0.5)
mix.s(TL.at("close", cl["card"]), paper(0.4), 0.2, pan=0.5)
mix.s(TL.at("close", cl["sign"][0]), echo(stab([69, 72, 76, 79], 0.3, 3500), BEAT * 0.75, 0.45, 4), 0.16, rev=0.5)

out = mix.render("public/audio/editorial-promo.wav", music_gain=0.85, reverb_time=0.5, reverb_gain=0.4, fade_out=2.0, drive=1.15)
print(f"{out.name}  {TL.total:.2f}s  compases desde {GRID0:.2f}s, cierre {CLOSE:.2f}s")
