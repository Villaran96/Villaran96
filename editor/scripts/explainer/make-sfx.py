#!/usr/bin/env python3
"""Sintetiza los efectos de sonido de los vídeos «Explainer» en public/explainer/sfx/ (solo numpy).

    python3 scripts/explainer/make-sfx.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parents[2] / "public" / "explainer" / "sfx"
rng = np.random.default_rng(7)


def t_axis(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def sweep(f0: float, f1: float, d: float) -> np.ndarray:
    t = t_axis(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def one_pole(x: np.ndarray, cutoff: np.ndarray) -> np.ndarray:
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def save(name: str, x: np.ndarray, peak: float = 0.8) -> None:
    x = x / max(1e-9, np.max(np.abs(x))) * peak
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((x * 32767).astype(np.int16).tobytes())
    print(f"  {name}.wav  {len(x) / SR:.2f} s")


def main() -> None:
    # pop: burbuja corta que cae de tono (aparece una tarjeta)
    t = t_axis(0.16)
    pop = sweep(950, 280, 0.16) * np.exp(-t / 0.045)
    pop[: int(0.002 * SR)] += rng.normal(0, 0.25, int(0.002 * SR))
    save("pop", pop, 0.7)

    # thud: golpe grave con chasquido (se estampa un sello)
    t = t_axis(0.32)
    thud = sweep(170, 48, 0.32) * np.exp(-t / 0.09)
    click = one_pole(rng.normal(0, 1, len(t)), np.full(len(t), 2500.0)) * np.exp(-t / 0.012)
    save("thud", thud + 0.35 * click, 0.85)

    # whoosh: ruido filtrado que sube y baja (entra el titular)
    d = 0.5
    t = t_axis(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    cut = 300 + 3200 * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    save("whoosh", one_pole(rng.normal(0, 1, len(t)), cut) * env, 0.6)

    # ding: campanilla (acierto, check)
    t = t_axis(0.9)
    ding = (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t / 0.22)
    save("ding", ding, 0.55)

    # tick: clic seco
    t = t_axis(0.05)
    save("tick", np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.006), 0.5)


if __name__ == "__main__":
    main()
