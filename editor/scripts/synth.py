"""Utilidades de síntesis compartidas por las bandas sonoras (sin samples: osciladores, ruido y filtros)."""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
ROOT = Path(__file__).resolve().parent.parent


def tt(d):
    return np.arange(int(max(0.0, d) * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def note(n):
    return 440 * 2 ** ((n - 69) / 12)


def saw(f, t):
    """Sierra PolyBLEP (sin aliasing)."""
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
    f = f0 + (f1 - f0) * (t / max(d, 1e-6)) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


class Timeline:
    """Lee el timeline.json de un vídeo y convierte fotogramas locales de escena en segundos."""

    def __init__(self, rel_path):
        self.data = json.loads((ROOT / rel_path).read_text())
        self.fps = self.data["fps"]
        self.starts = {}
        t = 0
        for s in self.data["scenes"]:
            self.starts[s["id"]] = t
            t += s["duration"]
        self.frames = t
        self.total = t / self.fps
        self.cues = self.data.get("cues", {})

    def at(self, scene, local=0):
        return (self.starts[scene] + local) / self.fps


class Mix:
    def __init__(self, seconds, seed=1):
        self.n = int((seconds + 0.5) * SR)
        self.seconds = seconds
        self.music = np.zeros((self.n, 2), np.float32)
        self.sfx = np.zeros((self.n, 2), np.float32)
        self.send = np.zeros((self.n, 2), np.float32)
        self.rng = np.random.default_rng(seed)

    def place(self, buf, t, sig, gain=1.0, pan=0.0, rev=0.0):
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
            self.send[i : i + len(sig), 0] += sig * gain * rev * l
            self.send[i : i + len(sig), 1] += sig * gain * rev * r

    def m(self, t, sig, gain=1.0, pan=0.0, rev=0.0):
        self.place(self.music, t, sig, gain, pan, rev)

    def s(self, t, sig, gain=1.0, pan=0.0, rev=0.0):
        self.place(self.sfx, t, sig, gain, pan, rev)

    def render(self, out_rel, music_gain=0.85, reverb_time=0.4, reverb_gain=0.45, fade_out=1.5, drive=1.2, lowpass=15000, extra=None):
        ir_t = tt(reverb_time * 3.5)
        ir = self.rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t / reverb_time)[:, None]
        ir[:, 0], ir[:, 1] = lp(ir[:, 0], 6500), lp(ir[:, 1], 6500)
        ir /= np.sqrt((ir**2).sum(axis=0))
        wet = np.stack([fftconvolve(self.send[:, c], ir[:, c])[: self.n] for c in range(2)], axis=1) * reverb_gain
        mix = self.music * music_gain + self.sfx + wet
        if extra is not None:
            mix += extra
        tl = np.arange(self.n) / SR
        if fade_out:
            mix *= np.clip((self.seconds - tl) / fade_out, 0, 1)[:, None] ** 0.8
        mix *= np.minimum(1, tl / 0.01)[:, None]
        mix = np.stack([lp(hp(mix[:, ch], 30), lowpass, 1) for ch in range(2)], axis=1)
        mix = np.tanh(mix * drive) / np.tanh(drive)
        mix /= np.max(np.abs(mix)) / 0.89
        mix = mix[: int(self.seconds * SR)]
        out = ROOT / out_rel
        out.parent.mkdir(parents=True, exist_ok=True)
        wavfile.write(out, SR, (mix * 32767).astype(np.int16))
        return out
