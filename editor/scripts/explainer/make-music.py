#!/usr/bin/env python3
"""Música de fondo ambiental para los vídeos «Story»: un bucle sin cortes por ambiente (solo numpy).

    python3 scripts/explainer/make-music.py            # genera todos
    python3 scripts/explainer/make-music.py deep       # solo uno

Ambientes: deep (océano profundo), space (espacio), mystery (misterio / true crime), lofi (tranquilo / finanzas, curiosidades).
Salida: public/story/music/<ambiente>.wav  (mono, 32 kHz, 32 s en bucle)
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 32000
LOOP = 32.0
XF = 2.5  # fundido cruzado para que el bucle no se note
OUT = Path(__file__).resolve().parents[2] / "public" / "story" / "music"
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name: str) -> float:
    """'A2' → 110 Hz, 'F#3' → …"""
    n = NOTE[name[0]] + (1 if "#" in name else 0) + (-1 if "b" in name else 0)
    octave = int(name[-1])
    return 440.0 * 2 ** ((n - 9 + 12 * (octave - 4)) / 12)


def axis(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def pad(freqs, t, detune=0.35, lfo=0.06, depth=0.5, seed=0):
    """Acorde envolvente: cada nota son tres senos desafinados con respiración lenta."""
    out = np.zeros_like(t)
    for i, f in enumerate(freqs):
        for d in (-detune, 0.0, detune):
            ph = (i * 1.7 + d) % 6.28
            out += np.sin(2 * np.pi * (f + d) * t + ph) * (1 - depth + depth * (0.5 + 0.5 * np.sin(2 * np.pi * lfo * (1 + 0.37 * i) * t + ph)))
    return out / (3 * len(freqs))


def event(t: np.ndarray, at: float, sig: np.ndarray, gain: float) -> None:
    k = int(at * SR)
    n = min(len(sig), len(t) - k)
    if n > 0:
        t[k : k + n] += gain * sig[:n]


def deep(t, rng):
    x = 0.55 * pad([hz("A1"), hz("E2"), hz("A2")], t, 0.2, 0.04, 0.6)
    x += 0.35 * pad([hz("A2"), hz("C3"), hz("E3"), hz("G3")], t, 0.4, 0.05, 0.8)
    x += 0.5 * lowpass(rng.normal(0, 1, len(t)), 140) * (0.6 + 0.4 * np.sin(2 * np.pi * t / LOOP * 2))
    e = axis(2.4)
    ping = np.sin(2 * np.pi * 1240 * e) * np.exp(-e / 0.5)
    for at, g in ((6.0, 0.05), (14.5, 0.04), (23.0, 0.05), (29.0, 0.035)):
        event(x, at, ping, g)
        event(x, at + 0.6, ping, g * 0.4)
    return x


def space(t, rng):
    x = 0.5 * pad([hz("D2"), hz("A2")], t, 0.15, 0.03, 0.4)
    x += 0.45 * pad([hz("D3"), hz("A3"), hz("E4"), hz("F#4")], t, 0.5, 0.07, 0.85)
    e = axis(1.8)
    for i, at in enumerate(np.linspace(1.0, 30.0, 11)):
        f = [hz("A5"), hz("D6"), hz("F#5"), hz("E6")][i % 4]
        event(x, float(at), np.sin(2 * np.pi * f * e) * np.exp(-e / 0.4), 0.05)
    return x


def mystery(t, rng):
    x = 0.55 * pad([hz("E2"), hz("F2")], t, 0.1, 0.05, 0.7)
    x += 0.3 * pad([hz("B3"), hz("C4"), hz("E4")], t, 0.3, 0.04, 0.8)
    e = axis(0.35)
    beat = np.sin(2 * np.pi * 52 * e) * np.exp(-e / 0.09)
    for k in range(int(LOOP / 1.6)):
        event(x, k * 1.6, beat, 0.9)
        event(x, k * 1.6 + 0.28, beat, 0.6)
    return x


def lofi(t, rng):
    bpm, beat_s = 76, 60 / 76
    chords = [["C3", "E3", "G3", "B3"], ["A2", "C3", "E3", "G3"], ["F2", "A2", "C3", "E3"], ["G2", "B2", "D3", "F3"]]
    x = np.zeros_like(t)
    bar = beat_s * 4
    e = axis(bar)
    for b in range(int(LOOP / bar)):
        for f in chords[b % 4]:
            tone = np.sign(np.sin(2 * np.pi * hz(f) * e)) * 0.0 + (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * hz(f) * e))  # triangular
            event(x, b * bar, tone * np.exp(-e / 1.6) * 0.5, 0.35)
    k = axis(0.3)
    kick = np.sin(2 * np.pi * (110 * np.exp(-k / 0.05) + 45) * k) * np.exp(-k / 0.1)
    h = axis(0.06)
    hat = rng.normal(0, 1, len(h)) * np.exp(-h / 0.012)
    for i in range(int(LOOP / beat_s)):
        event(x, i * beat_s, kick, 0.55 if i % 2 == 0 else 0.0)
        event(x, i * beat_s + beat_s / 2, hat, 0.07)
    x += 0.012 * rng.normal(0, 1, len(t)) * (rng.random(len(t)) > 0.995)  # crepitar de vinilo
    return lowpass(x, 3800)


MOODS = {"deep": deep, "space": space, "mystery": mystery, "lofi": lofi}


def build(name: str) -> None:
    rng = np.random.default_rng(11)
    t = axis(LOOP + XF)
    x = MOODS[name](t, rng)
    n, xf = int(LOOP * SR), int(XF * SR)
    fade = np.linspace(0, 1, xf)
    loop = x[:n].copy()
    loop[:xf] = x[:xf] * fade + x[n : n + xf] * (1 - fade)  # la cola se funde con el principio
    loop *= 0.55 / max(1e-9, np.max(np.abs(loop)))
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((loop * 32767).astype(np.int16).tobytes())
    print(f"  {name}.wav  {LOOP:.0f} s")


if __name__ == "__main__":
    for m in sys.argv[1:] or MOODS:
        build(m)
