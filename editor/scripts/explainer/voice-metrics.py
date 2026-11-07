#!/usr/bin/env python3
"""Mide cuánto «canta» una voz (tono medio, variación y rango de entonación, ritmo) y la compara con una referencia.

    .venv/bin/python scripts/explainer/voice-metrics.py referencia.wav candidata1.mp3 candidata2.wav …

La voz de un locutor expresivo varía ~5 semitonos (σ) y ~17 de rango; una voz «muerta» (Piper) queda en ~2,8 y ~10.
Sirve para elegir entre voces de biblioteca sin poder escucharlas. Requiere praat-parselmouth y ffmpeg.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import parselmouth


def metrics(path: str) -> dict:
    wav = Path(tempfile.mkdtemp()) / "x.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", str(wav)], check=True)
    snd = parselmouth.Sound(str(wav))
    f0 = snd.to_pitch(time_step=0.01, pitch_floor=70, pitch_ceiling=400).selected_array["frequency"]
    f0 = f0[f0 > 0]
    st = 12 * np.log2(f0 / np.median(f0))
    return {"f0": float(np.median(f0)), "sigma": float(st.std()), "range": float(np.percentile(st, 95) - np.percentile(st, 5)), "dur": snd.duration}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    ref = metrics(sys.argv[1])
    print(f"{'':<28}{'F0 Hz':>7}{'σ st':>7}{'rango st':>10}")
    print(f"{'REFERENCIA':<28}{ref['f0']:7.0f}{ref['sigma']:7.2f}{ref['range']:10.1f}")
    rows = []
    for p in sys.argv[2:]:
        m = metrics(p)
        dist = abs(12 * np.log2(m["f0"] / ref["f0"])) / 3 + abs(m["sigma"] - ref["sigma"]) / 2
        rows.append((dist, Path(p).name, m))
    for dist, name, m in sorted(rows):
        print(f"{name:<28}{m['f0']:7.0f}{m['sigma']:7.2f}{m['range']:10.1f}   distancia {dist:.2f}")
