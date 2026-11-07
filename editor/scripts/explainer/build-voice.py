#!/usr/bin/env python3
"""Genera la voz y los tiempos de un vídeo «Explainer».

Uso:
    .venv/bin/python scripts/explainer/build-voice.py <slug> [opciones]

Lee   public/<kind>/<slug>/script.json     (kind: explainer por defecto, o story con --kind story)
Crea  public/<kind>/<slug>/voice.wav      locución completa (mono, 44,1 kHz)
      public/<kind>/<slug>/timing.json    tiempos por escena y palabra + envolvente de la boca
      public/<kind>/<slug>/captions.json  palabras en formato Caption[] de Remotion

Pasos: (1) sintetiza cada escena con Piper (o usa tus propios audios con --voices-dir),
(2) la transcribe con Whisper para saber cuándo suena cada palabra y la alinea con el guion,
(3) coloca las escenas una tras otra y calcula cuánto abre la boca el personaje en cada fotograma.
"""
from __future__ import annotations

import argparse
import difflib
import io
import json
import math
import re
import subprocess
import sys
import tempfile
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
VOICES = ROOT / "models" / "voices"
FPS = 30
SR = 44100
FIRST_LEAD = 0.25  # silencio antes de la primera palabra
SCENE_LEAD = 0.12  # los elementos de la escena aparecen un instante antes de que se hable
DEFAULT_PAD = 0.30
LAST_PAD = 1.30


# ───────────────────────────────────────────────────────── texto


def narration_tokens(narration: str) -> list[str]:
    """Palabras de la narración, sin marcas *acento*. Misma tokenización que src/explainer/markup.ts."""
    return [t for t in (w.replace("*", "") for w in narration.split()) if t]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)))


def spoken_text(narration: str, pronounce: dict[str, str]) -> str:
    text = narration.replace("*", "")
    for word, said in pronounce.items():
        text = re.sub(rf"\b{re.escape(word)}\b", said, text)
    return text


# ───────────────────────────────────────────────────────── audio


def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    if sr_in == sr_out:
        return x.astype(np.float32)
    n = int(round(len(x) * sr_out / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def trim_silence(x: np.ndarray, sr: int, thr: float = 0.012, keep: float = 0.05) -> tuple[np.ndarray, float]:
    """Recorta silencio de los extremos; devuelve el audio y cuánto se quitó al principio (s)."""
    idx = np.flatnonzero(np.abs(x) > thr)
    if idx.size == 0:
        return x, 0.0
    a = max(0, idx[0] - int(keep * sr))
    b = min(len(x), idx[-1] + int(keep * sr))
    return x[a:b], a / sr


def stretch(path: Path, tempo: float, semitones: float) -> Path:
    """Acelera (sin cambiar el tono) y/o desplaza el tono de un audio con rubberband de ffmpeg."""
    out = Path(tempfile.mkdtemp()) / "x.wav"
    af = f"rubberband=tempo={tempo:.4f}:pitch={2 ** (semitones / 12):.5f}:formant=preserved:pitchq=quality"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-af", af, "-ac", "1", "-ar", str(SR), str(out)], check=True)
    return out


def median_f0(path: Path) -> float:
    """Tono medio (Hz) de un audio, con Praat. Requiere praat-parselmouth."""
    import parselmouth

    tmp = Path(tempfile.mkdtemp()) / "x.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", "16000", str(tmp)], check=True)
    f0 = parselmouth.Sound(str(tmp)).to_pitch(time_step=0.01, pitch_floor=70, pitch_ceiling=400).selected_array["frequency"]
    f0 = f0[f0 > 0]
    return float(np.median(f0)) if f0.size else 0.0


def load_audio(path: Path) -> np.ndarray:
    """Cualquier formato (wav, mp3, m4a…) → float32 mono a 44,1 kHz, con PyAV."""
    import av

    out: list[np.ndarray] = []
    rs = av.AudioResampler(format="flt", layout="mono", rate=SR)
    with av.open(str(path)) as c:
        for frame in c.decode(c.streams.audio[0]):
            for f in rs.resample(frame):
                out.append(f.to_ndarray().reshape(-1))
        for f in rs.resample(None):
            out.append(f.to_ndarray().reshape(-1))
    return np.concatenate(out) if out else np.zeros(1, np.float32)


def ensure_voice(name: str) -> Path:
    model = VOICES / f"{name}.onnx"
    if not model.exists():
        VOICES.mkdir(parents=True, exist_ok=True)
        print(f"Descargando la voz {name}…", flush=True)
        subprocess.run([sys.executable, "-m", "piper.download_voices", "--download-dir", str(VOICES), name], check=True)
    return model


def synth_all(scenes: list[dict], meta: dict, args: argparse.Namespace) -> list[np.ndarray]:
    """Un float32 mono a 44,1 kHz por escena."""
    if args.voices_dir:
        out = []
        for s in scenes:
            found = [p for ext in ("wav", "mp3", "m4a", "ogg", "flac") if (p := Path(args.voices_dir) / f"{s['id']}.{ext}").exists()]
            if not found:
                sys.exit(f"Falta el audio de la escena «{s['id']}» en {args.voices_dir} (<id>.wav/.mp3/.m4a)")
            out.append(found[0])
        shifts = [0.0] * len(out)
        if args.match_pitch:
            f0s = [median_f0(p) for p in out]
            target = args.target_f0 or float(np.median([f for f in f0s if f > 0]))
            # Mismo locutor, pero cada toma sale con un tono algo distinto: se acercan al tono común (máx. ±2 st).
            shifts = [max(-2.0, min(2.0, 12 * math.log2(target / f))) if f > 0 else 0.0 for f in f0s]
            shifts = [x if abs(x) >= 0.6 else 0.0 for x in shifts]
            print("  ajuste de tono (st): " + ", ".join(f"{s_['id']} {x:+.1f}" for s_, x in zip(scenes, shifts)))
        audios = []
        for p, st in zip(out, shifts):
            src = stretch(p, args.tempo, st) if (args.tempo != 1.0 or st) else p
            audios.append(load_audio(src))
        return audios

    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(str(ensure_voice(args.voice or meta.get("voice") or "es_ES-davefx-medium")))
    speed = args.speed or meta.get("speed") or 1.0
    cfg = SynthesisConfig(length_scale=1.0 / speed)
    pronounce = meta.get("pronounce", {})
    out = []
    for s in scenes:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            voice.synthesize_wav(spoken_text(s["narration"], pronounce), wf, syn_config=cfg)
        buf.seek(0)
        with wave.open(buf) as wf:
            sr = wf.getframerate()
            raw = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        out.append(resample(raw, sr, SR))
    return out


# ───────────────────────────────────────────────────────── alineación palabra a palabra


def heard_words(model, audio_44k: np.ndarray, lang: str) -> list[tuple[str, float, float]]:
    segs, _ = model.transcribe(
        resample(audio_44k, SR, 16000),
        language=lang,
        word_timestamps=True,
        beam_size=5,
        vad_filter=False,
        condition_on_previous_text=False,
    )
    return [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in (s.words or []) if w.word.strip()]


def align(words: list[str], heard: list[tuple[str, float, float]], t0: float, t1: float) -> list[tuple[float, float]]:
    """Asigna (inicio, fin) a cada palabra del guion a partir de lo que oyó Whisper."""
    a = [norm(w) for w in words]
    b = [norm(h[0]) for h in heard]
    times: list[tuple[float, float] | None] = [None] * len(words)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k][1], heard[j1 + k][2])
        elif tag == "replace" and j2 > j1:
            # Distinto número de palabras: reparte el tramo oído en proporción a la longitud.
            s, e = heard[j1][1], heard[j2 - 1][2]
            wts = [len(words[k]) + 1 for k in range(i1, i2)]
            cur = s
            for k, wt in zip(range(i1, i2), wts):
                d = (e - s) * wt / sum(wts)
                times[k] = (cur, cur + d)
                cur += d

    i, n = 0, len(times)
    while i < n:  # palabras que Whisper no oyó: interpolar entre las vecinas
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < n and times[j] is None:
            j += 1
        start = times[i - 1][1] if i > 0 else t0
        end = times[j][0] if j < n else t1
        end = max(end, start + 0.08 * (j - i))
        wts = [len(words[k]) + 1 for k in range(i, j)]
        cur = start
        for k, wt in zip(range(i, j), wts):
            d = (end - start) * wt / sum(wts)
            times[k] = (cur, cur + d)
            cur += d
        i = j

    out: list[tuple[float, float]] = []
    prev = t0
    for s, e in times:  # monótono y sin solapes
        s = max(s, prev)
        e = max(e, s + 0.04)
        out.append((s, e))
        prev = s
    return out


def even_split(words: list[str], t0: float, t1: float) -> list[tuple[float, float]]:
    wts = [len(w) + 1 for w in words]
    cur, out = t0, []
    for wt in wts:
        d = (t1 - t0) * wt / sum(wts)
        out.append((cur, cur + d))
        cur += d
    return out


# ───────────────────────────────────────────────────────── boca


def mouth_levels(x: np.ndarray, total_frames: int) -> str:
    hop = SR / FPS
    rms = np.zeros(total_frames, np.float32)
    for i in range(total_frames):
        seg = x[int(max(0, (i - 0.5) * hop)) : int((i + 1.5) * hop)]
        rms[i] = math.sqrt(float(np.mean(seg**2))) if seg.size else 0.0
    voiced = rms[rms > 0.01]
    ref = float(np.percentile(voiced, 90)) if voiced.size else 1.0
    lv = rms / max(ref, 1e-6)
    q = np.where(lv < 0.12, 0, np.where(lv < 0.38, 1, np.where(lv < 0.80, 2, 3))).astype(int)
    sm = q.copy()
    for i in range(1, len(q) - 1):  # mediana de 3 fotogramas: evita parpadeos de la boca
        sm[i] = sorted((q[i - 1], q[i], q[i + 1]))[1]
    return "".join(str(v) for v in sm)


# ───────────────────────────────────────────────────────── principal


def write_outputs(folder: Path, mix: np.ndarray, timing_scenes: list[dict], total: float) -> None:
    """voice.wav + timing.json + captions.json a partir de la mezcla final y los tiempos de cada escena."""
    total_frames = int(round(total * FPS))
    mix = mix * (0.89 / max(1e-6, float(np.max(np.abs(mix)))))  # pico a −1 dBFS
    with wave.open(str(folder / "voice.wav"), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    timing = {"fps": FPS, "duration": round(total, 3), "mouth": mouth_levels(mix, total_frames), "scenes": timing_scenes}
    (folder / "timing.json").write_text(json.dumps(timing, ensure_ascii=False), encoding="utf-8")
    captions = [
        {"text": ("" if j == 0 and k == 0 else " ") + w["t"], "startMs": round(w["s"] * 1000), "endMs": round(w["e"] * 1000), "timestampMs": round((w["s"] + w["e"]) * 500), "confidence": None}
        for k, sc in enumerate(timing_scenes)
        for j, w in enumerate(sc["words"])
    ]
    (folder / "captions.json").write_text(json.dumps(captions, ensure_ascii=False), encoding="utf-8")
    print(f"\nListo: {total:.1f} s ({total_frames} fotogramas) → {folder.relative_to(ROOT)}/")


def build_from_take(args: argparse.Namespace, scenes: list[dict], folder: Path) -> None:
    """Una locución continua (--full-audio): se usa entera y los límites de escena salen de los tiempos de las palabras."""
    from faster_whisper import WhisperModel

    src = Path(args.full_audio)
    shift = 0.0
    if args.match_pitch:
        f0 = median_f0(src)
        target = args.target_f0 or f0
        shift = max(-5.0, min(5.0, 12 * math.log2(target / f0))) if f0 > 0 else 0.0
        print(f"  tono medio de la toma {f0:.0f} Hz → objetivo {target:.0f} Hz: desplazamiento global {shift:+.2f} st")
    audio = load_audio(stretch(src, args.tempo, shift) if (args.tempo != 1.0 or abs(shift) > 0.05) else src)

    print(f"Cargando Whisper ({args.whisper})…", flush=True)
    model = WhisperModel(args.whisper, device="cpu", compute_type="int8")
    counts = [len(narration_tokens(s["narration"])) for s in scenes]
    words = [w for s in scenes for w in narration_tokens(s["narration"])]
    times = align(words, heard_words(model, audio, args.lang), 0.0, len(audio) / SR)

    lead = max(0.0, FIRST_LEAD - times[0][0])  # silencio inicial antes de la primera palabra
    times = [(a + lead, b + lead) for a, b in times]
    total = math.ceil((times[-1][1] + LAST_PAD) * FPS) / FPS
    mix = np.zeros(int(math.ceil(total * SR)) + SR, np.float32)
    k0 = int(lead * SR)
    mix[k0 : k0 + len(audio)] = audio[: len(mix) - k0]
    mix = mix[: int(math.ceil(total * SR))]

    timing_scenes, k, prev_end = [], 0, 0.0
    for i, (s, n) in enumerate(zip(scenes, counts)):
        ts = times[k : k + n]
        k += n
        first, last = ts[0][0], ts[-1][1]
        # La escena siguiente empieza a mitad del hueco entre la última palabra de esta y la primera de la otra.
        end = total if i == len(scenes) - 1 else min(total, round(((last + times[k][0]) / 2) * FPS) / FPS)
        end = max(end, prev_end + 1 / FPS)
        timing_scenes.append(
            {
                "id": s["id"],
                "start": round(prev_end, 3),
                "voiceStart": round(first, 3),
                "voiceEnd": round(last, 3),
                "end": round(end, 3),
                "words": [{"t": w, "s": round(a, 3), "e": round(b, 3)} for w, (a, b) in zip(words[k - n : k], ts)],
            }
        )
        print(f"  {s['id']:<14} voz {first:5.1f}–{last:5.1f} s · escena {prev_end:5.1f}–{end:5.1f} s · {n} palabras")
        prev_end = end
    write_outputs(folder, mix, timing_scenes, total)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--kind", default="explainer", choices=["explainer", "story"], help="Carpeta de public/: explainer (tutoriales) o story (historias animadas)")
    ap.add_argument("--voice", help="Voz de Piper (por defecto meta.voice o es_ES-davefx-medium)")
    ap.add_argument("--speed", type=float, help="1 = normal; 1.1 = un 10 % más rápido")
    ap.add_argument("--tempo", type=float, default=1.0, help="Con --voices-dir: acelera la locución sin cambiar el tono (1.08 = +8 %%)")
    ap.add_argument("--target-f0", type=float, default=0.0, help="Con --match-pitch: tono objetivo en Hz (por defecto, la mediana de las tomas)")
    ap.add_argument("--match-pitch", action="store_true", help="Con --voices-dir: iguala el tono medio entre escenas (±2 semitonos como máximo)")
    ap.add_argument("--full-audio", help="Una locución continua de todo el guion (mp3/wav): se usa entera y las escenas se cortan por los tiempos de las palabras")
    ap.add_argument("--voices-dir", help="Carpeta con un audio por escena (<id>.wav/.mp3…) en vez de usar Piper")
    ap.add_argument("--whisper", default="small", help="Modelo de Whisper para alinear (tiny/base/small/medium)")
    ap.add_argument("--lang", default="es")
    ap.add_argument("--no-align", action="store_true", help="No usar Whisper: reparte las palabras por longitud")
    args = ap.parse_args()

    folder = PUBLIC / args.kind / args.slug
    script = json.loads((folder / "script.json").read_text(encoding="utf-8"))
    scenes, meta = script["scenes"], script.get("meta", {})
    ids = [s["id"] for s in scenes]
    if len(set(ids)) != len(ids):
        sys.exit("Hay ids de escena repetidos en script.json")

    if args.full_audio:
        build_from_take(args, scenes, folder)
        return

    print(f"Sintetizando {len(scenes)} escenas…", flush=True)
    raw = synth_all(scenes, meta, args)

    model = None
    if not args.no_align:
        from faster_whisper import WhisperModel

        print(f"Cargando Whisper ({args.whisper})…", flush=True)
        model = WhisperModel(args.whisper, device="cpu", compute_type="int8")

    t = 0.0
    chunks: list[tuple[float, np.ndarray]] = []
    timing_scenes = []
    for i, (s, audio) in enumerate(zip(scenes, raw)):
        audio, cut = trim_silence(audio, SR)
        dur = len(audio) / SR
        words = narration_tokens(s["narration"])
        start = t
        voice_start = start + (FIRST_LEAD if i == 0 else SCENE_LEAD)
        local = (
            align(words, heard_words(model, audio, args.lang), 0.0, dur)
            if model is not None
            else even_split(words, 0.0, dur)
        )
        voice_end = voice_start + dur
        pad = s.get("pad", LAST_PAD if i == len(scenes) - 1 else DEFAULT_PAD)
        end = math.ceil((voice_end + pad) * FPS) / FPS
        chunks.append((voice_start, audio))
        timing_scenes.append(
            {
                "id": s["id"],
                "start": round(start, 3),
                "voiceStart": round(voice_start, 3),
                "voiceEnd": round(voice_end, 3),
                "end": round(end, 3),
                "words": [{"t": w, "s": round(voice_start + a, 3), "e": round(voice_start + b, 3)} for w, (a, b) in zip(words, local)],
            }
        )
        print(f"  {s['id']:<14} {dur:5.1f} s de voz · escena {start:5.1f}–{end:5.1f} s · {len(words)} palabras")
        t = end

    total_frames = int(round(t * FPS))
    mix = np.zeros(int(math.ceil(t * SR)) + SR, np.float32)
    for at, audio in chunks:
        k = int(round(at * SR))
        fade = np.ones(len(audio), np.float32)
        f = min(int(0.006 * SR), len(audio) // 2)
        fade[:f] = np.linspace(0, 1, f)
        fade[-f:] = np.linspace(1, 0, f)
        mix[k : k + len(audio)] += audio * fade
    mix = mix[: int(math.ceil(t * SR))]
    mix *= 0.89 / max(1e-6, float(np.max(np.abs(mix))))  # pico a −1 dBFS

    with wave.open(str(folder / "voice.wav"), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())

    timing = {"fps": FPS, "duration": round(t, 3), "mouth": mouth_levels(mix, total_frames), "scenes": timing_scenes}
    (folder / "timing.json").write_text(json.dumps(timing, ensure_ascii=False), encoding="utf-8")

    captions = [
        {"text": ("" if j == 0 and k == 0 else " ") + w["t"], "startMs": round(w["s"] * 1000), "endMs": round(w["e"] * 1000), "timestampMs": round((w["s"] + w["e"]) * 500), "confidence": None}
        for k, sc in enumerate(timing_scenes)
        for j, w in enumerate(sc["words"])
    ]
    (folder / "captions.json").write_text(json.dumps(captions, ensure_ascii=False), encoding="utf-8")
    print(f"\nListo: {t:.1f} s ({total_frames} fotogramas) → {folder.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
