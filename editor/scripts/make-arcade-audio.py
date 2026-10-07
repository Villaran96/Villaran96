#!/usr/bin/env python3
"""Banda sonora chiptune del anuncio arcade (ArcadePromo), sincronizada con src/arcade/timeline.json.

Canales al estilo de las consolas de 8 bits: dos pulsos (melodía y arpegios), triángulo (bajo) y ruido (batería).
Uso: python3 scripts/make-arcade-audio.py  ->  public/audio/arcade-promo.wav
"""
import numpy as np

from synth import Mix, Timeline, lp, hp, note, tt

TL = Timeline("src/arcade/timeline.json")
C = TL.cues
BEAT = 60 / TL.data["bpm"]
E8 = BEAT / 2
S16 = BEAT / 4
BAR = 4 * BEAT
mix = Mix(TL.total, seed=8)
rng = mix.rng


# ---------- canales ----------
def pulse(f, d, duty=0.5, decay=None, vib=0.0, slide=0.0):
    t = tt(d)
    if len(t) < 2:
        return np.zeros(len(t))
    fr = f * (1 + vib * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t / 0.15)) * (1 + slide * t / max(d, 1e-6))
    ph = np.cumsum(fr) / 44100 % 1
    s = np.where(ph < duty, 1.0, -1.0)
    env = np.minimum(1, t / 0.002) * np.minimum(1, np.maximum(0, d - t) / 0.015)
    if decay:
        env *= np.exp(-t / decay)
    return lp(s, 9000) * env


def tri(f, d):
    t = tt(d)
    ph = (f * t) % 1
    s = np.abs(ph * 4 - 2) - 1
    s = np.round(s * 8) / 8  # 4 bits, como el canal triángulo
    return s * np.minimum(1, np.maximum(0, d - t) / 0.01)


def noise(d, decay, rate=1, lo=None, hi=None):
    n = int(d * 44100)
    raw = rng.choice([-1.0, 1.0], size=n // rate + 1).repeat(rate)[:n]
    if hi:
        raw = lp(raw, hi)
    if lo:
        raw = hp(raw, lo)
    return raw * np.exp(-tt(d) / decay)


def kick():
    t = tt(0.14)
    f = 50 + 220 * np.exp(-t / 0.02)
    ph = np.cumsum(f) / 44100 % 1
    return (np.abs(ph * 4 - 2) - 1) * np.exp(-t / 0.06)


def snare():
    n = noise(0.14, 0.04, rate=2, hi=8000) * 0.8
    tone = pulse(190, 0.05, 0.5, 0.02) * 0.3
    n[: len(tone)] += tone
    return n


def hat(open_=False):
    return noise(0.12 if open_ else 0.03, 0.04 if open_ else 0.008, rate=1, lo=7000) * 0.6


def arp(chord, d, rate=1 / 30, duty=0.125, gain=1.0):
    out = np.zeros(int(d * 44100))
    k = 0
    pos = 0.0
    while pos < d - 0.002:
        seg = pulse(note(chord[k % len(chord)]), min(rate, d - pos), duty)
        i = int(pos * 44100)
        out[i : i + len(seg)] += seg[: len(out) - i]
        pos += rate
        k += 1
    return out * gain


def play(seq, t0, step, inst, gain=1.0, pan=0.0, rev=0.0, transpose=0):
    """Secuencia de notas MIDI (0 = silencio, número negativo = alarga la nota anterior)."""
    i = 0
    while i < len(seq):
        n = seq[i]
        length = 1
        while i + length < len(seq) and seq[i + length] == -1:
            length += 1
        if n > 0:
            mix.m(t0 + i * step, inst(note(n + transpose), step * length * 0.95), gain, pan, rev)
        i += length


lead = lambda f, d: pulse(f, d, 0.5, decay=None, vib=0.006)  # noqa: E731
lead2 = lambda f, d: pulse(f, d, 0.25, decay=0.25)  # noqa: E731
CH = {"C": [60, 64, 67], "Am": [57, 60, 64], "F": [53, 57, 60], "G": [55, 59, 62], "Dm": [50, 53, 57], "E": [52, 56, 59]}
ROOT = {"C": 36, "Am": 33, "F": 29, "G": 31, "Dm": 38, "E": 40}


def groove(t0, bars, progression, busy=False, transpose=0, drums=True):
    for b in range(bars):
        name = progression[b % len(progression)]
        bt = t0 + b * BAR
        mix.m(bt, arp([n + 12 + transpose for n in CH[name]], BAR), 0.13, pan=0.35)
        for e in range(8):
            r = ROOT[name] + transpose + (12 if e % 2 else 0)
            mix.m(bt + e * E8, tri(note(r + 12), E8 * 0.9), 0.5)
        if not drums:
            continue
        for k in range(4):
            kt = bt + k * BEAT
            mix.m(kt, kick() if k % 2 == 0 else snare(), 0.6 if k % 2 == 0 else 0.45)
            mix.m(kt + E8, hat(open_=k == 3), 0.25, pan=-0.3)
            if busy:
                mix.m(kt + S16, hat(), 0.14, pan=0.3)
                mix.m(kt + 3 * S16, hat(), 0.14, pan=0.3)


def blip(f=1200, d=0.035, duty=0.5):
    return pulse(f, d, duty, decay=0.02)


def coin():
    a = pulse(1047, 0.06, 0.5)
    b = pulse(1568, 0.3, 0.5, decay=0.12)
    return np.concatenate([a, b])


def fanfare(notes, step=0.07, hold=0.6, duty=0.5):
    parts = [pulse(note(n), step, duty) for n in notes[:-1]] + [pulse(note(notes[-1]), hold, duty, decay=hold * 0.6, vib=0.008)]
    return np.concatenate(parts)


def typing(t0, text_len, gain=0.12):
    speed = TL.data["typeSpeed"] / TL.fps
    for k in range(0, text_len, 2):
        mix.s(t0 + k * speed, blip(900 + rng.random() * 200, 0.025, 0.25), gain)


# ---------- TÍTULO ----------
title0 = TL.at("title")
mix.m(title0, arp([60, 64, 67, 72], BAR * 0.6, duty=0.25), 0.12)
for k, n in enumerate([72, 76, 79]):
    mix.s(title0 + 0.05 + k * 0.08, blip(note(n + 12), 0.06), 0.12)
t_title = TL.at("title", C["title"]["titleIn"])
mix.s(t_title, noise(0.4, 0.15, rate=3, hi=3000), 0.35)
mix.s(t_title, kick(), 0.6)
groove(t_title, 1, ["C", "G"], drums=True)
play([72, -1, 76, -1, 79, -1, 84, -1, 83, -1, 79, -1, 76, 79, 84, -1], t_title, E8, lead, 0.32, rev=0.2)
t_start = TL.at("title", C["title"]["start"])
for k in range(3):
    mix.s(t_start + k * 0.05, blip(1760, 0.04), 0.2)
mix.s(TL.at("title", C["title"]["flash"]), fanfare([72, 76, 79, 84], 0.05, 0.4), 0.3, rev=0.3)

# ---------- NIVEL 1 ----------
l1 = TL.at("level1")
c1 = C["level1"]
mix.s(l1 + 0.05, fanfare([67, 72, 76, 79], 0.06, 0.3, 0.25), 0.25)
groove(l1 + BAR * 0.5, 3, ["C", "Am", "F", "G"])
LEAD1 = [72, 76, 79, 76, 74, 72, 0, 67, 69, 72, 76, 72, 74, 76, 74, 72, 69, 0, 72, 77, 76, 74, 72, 69, 71, 74, 79, 0, 77, 76, 74, 71]
play(LEAD1[:24], l1 + BAR * 0.5, E8, lead, 0.26, rev=0.15)
for i, t0 in enumerate(c1["customers"]):
    st = t0 + 16
    mix.s(TL.at("level1", st + 3), blip(2093, 0.05), 0.12)
    mix.s(TL.at("level1", st + 5), fanfare([84, 88], 0.05, 0.12, 0.25), 0.14)
    for k in range(3):
        mix.s(TL.at("level1", st + 13 + k * 2), blip(600 - k * 60, 0.04, 0.25), 0.1)
for d in c1["dialog"]:
    typing(TL.at("level1", d["at"]), len(d["text"]))
for k in range(4):
    mix.s(TL.at("level1", c1["alarm"]) + k * 0.16, pulse(880 if k % 2 == 0 else 660, 0.12, 0.5), 0.18)
mix.s(TL.at("level1", c1["dissolve"]), pulse(600, 0.5, 0.5, slide=-0.85) * np.linspace(1, 0, int(0.5 * 44100)), 0.2)

# ---------- OBJETO ----------
pu = TL.at("powerup")
cp = C["powerup"]
for k in range(int((cp["open"] - cp["shake"]) / 2)):
    mix.s(TL.at("powerup", cp["shake"] + k * 2), snare(), 0.25 + 0.02 * k)
mix.m(pu, arp([57, 60, 64], (cp["open"]) / TL.fps, duty=0.25), 0.08)
t_open = TL.at("powerup", cp["open"])
mix.s(t_open, fanfare([60, 64, 67, 72, 76, 79, 84, 88], 0.045, 0.9, 0.5), 0.32, rev=0.35)
mix.m(t_open + 0.36, arp([72, 76, 79, 84], 1.3, duty=0.25), 0.14, pan=-0.3)
mix.m(t_open + 0.36, tri(note(48), 1.3), 0.45)
for k in range(10):
    mix.s(t_open + 0.4 + k * 0.17, blip(2600 + rng.random() * 1200, 0.03, 0.125), 0.07, pan=rng.random() - 0.5)
for t in cp["text"]:
    mix.s(TL.at("powerup", t), blip(1320, 0.05), 0.14)
mix.s(TL.at("powerup", cp["blinds"]), noise(0.4, 0.15, rate=2, lo=1500), 0.2)

# ---------- NIVEL 2 ----------
l2 = TL.at("level2")
c2 = C["level2"]
mix.s(l2 + 0.05, fanfare([67, 72, 76, 79, 84], 0.05, 0.3, 0.25), 0.25)
ff = TL.at("level2", c2["fastForward"])
groove(l2, 3, ["C", "Am", "F", "G"], busy=True)
LEAD2 = [84, 0, 79, 84, 86, 84, 79, 76, 81, 0, 76, 81, 84, 81, 76, 72, 77, 81, 84, 89, 88, 84, 81, 77, 79, 83, 86, 91, 89, 86, 83, 79]
play(LEAD2[:24], l2, E8, lead2, 0.24, rev=0.15)
play([n - 12 if n else 0 for n in LEAD2[:24]], l2, E8, lead, 0.1, pan=0.4)
# Cámara rápida: todo sube un tono y la melodía va al doble.
groove(l2 + BAR * 3, 2, ["G", "C"], busy=True, transpose=2)
play(LEAD2[24:] + LEAD2[:8] + LEAD2[24:] + LEAD2[:8], l2 + BAR * 3, E8 / 2, lead2, 0.22, transpose=2)
mix.s(ff, pulse(300, 0.3, 0.5, slide=2.5), 0.2)
speeds = [1, 1, 1.3, 1.6, 2, 2.4]
for i, t0 in enumerate(c2["customers"]):
    sp = speeds[i]
    tap = t0 + 22 / sp
    mix.s(TL.at("level2", tap), fanfare([79, 91], 0.04, 0.1, 0.25), 0.18)
    mix.s(TL.at("level2", tap), blip(1568, 0.05), 0.1)
    mix.s(TL.at("level2", tap + 18 / sp), coin(), 0.24)
    if i >= 1:
        mix.s(TL.at("level2", tap + 18 / sp) + 0.08, blip(note(84 + i * 2), 0.06), 0.1)
for d in c2["dialog"]:
    typing(TL.at("level2", d["at"]), len(d["text"]))
mix.s(TL.at("level2", c2["flash"]), fanfare([76, 79, 88, 84, 86, 91], 0.07, 0.4), 0.3, rev=0.3)

# ---------- NIVEL SUPERADO ----------
cl = TL.at("clear")
cc = C["clear"]
play([72, 76, 79, 84, 79, 84, 88, -1, 91, -1, -1, -1, -1, -1, 0, 0], cl + 0.05, S16 * 1.2, lead, 0.3, rev=0.3)
mix.m(cl + 0.05, arp([60, 64, 67, 72], BAR * 2 - 0.1, duty=0.25), 0.1, pan=-0.3)
mix.m(cl + 0.05, tri(note(48), BAR * 2 - 0.2), 0.4)
for i, t in enumerate(cc["stars"]):
    mix.s(TL.at("clear", t), pulse(note(84 + [0, 2, 4, 7, 12][i]), 0.18, 0.5, decay=0.08), 0.22, rev=0.3)
for t, length in zip(cc["stats"], [23, 23, 23]):
    for k in range(0, length, 2):
        mix.s(TL.at("clear", t) + k / 2 / TL.fps, blip(1000, 0.02, 0.25), 0.08)

# ---------- ¿CONTINUAR? ----------
co = TL.at("continue")
cn = C["continue"]
groove(co, 2, ["Am", "F"], drums=False)
play([69, -1, 72, -1, 76, -1, 74, 72, 77, -1, 76, -1, 72, -1, 0, 0], co, E8, lead2, 0.2, rev=0.25)
mix.s(TL.at("continue", cn["card"]), pulse(400, 0.3, 0.5, slide=1.5) * np.linspace(1, 0.3, int(0.3 * 44100)), 0.15)
mix.s(TL.at("continue", cn["lines"][1]), fanfare([60, 67, 72, 76, 79, 84], 0.05, 0.9, 0.25), 0.25, rev=0.4)
mix.m(TL.at("continue", cn["lines"][1]), arp([60, 64, 67, 72], 1.8, duty=0.25), 0.08)
for k in range(3):
    mix.s(TL.at("continue", cn["blink"]) + k * 0.53, blip(1760, 0.05), 0.12)

out = mix.render("public/audio/arcade-promo.wav", music_gain=0.8, reverb_time=0.25, reverb_gain=0.3, fade_out=1.2, drive=1.1, lowpass=12000)
print(f"{out.name}  {TL.total:.2f}s  escenas={ {k: round(v / TL.fps, 2) for k, v in TL.starts.items()} }")
