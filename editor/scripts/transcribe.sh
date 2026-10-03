#!/usr/bin/env bash
# Transcribe un vídeo/audio con whisper.cpp y deja captions por palabra (formato Remotion Caption[]).
#
# Uso:   scripts/transcribe.sh public/mi-video.mp4 [modelo=small] [idioma=es]
# Salida: public/<nombre>.captions.json
#
# Requisitos: whisper.cpp compilado en editor/whisper.cpp (ver README) y el modelo ggml
# en editor/models/ggml-<modelo>.bin (descargable con scripts/get-model.sh o subido a mano).
set -euo pipefail

cd "$(dirname "$0")/.."

INPUT="${1:?Uso: scripts/transcribe.sh <video> [modelo] [idioma]}"
MODEL="${2:-small}"
LANG_CODE="${3:-es}"

CLI="whisper.cpp/build/bin/whisper-cli"
MODEL_FILE="models/ggml-${MODEL}.bin"
NAME="$(basename "${INPUT%.*}")"
WAV="$(mktemp --suffix=.wav)"
OUT_BASE="$(mktemp -u)"

[ -x "$CLI" ] || { echo "Falta $CLI: compila whisper.cpp primero." >&2; exit 1; }
[ -f "$MODEL_FILE" ] || { echo "Falta el modelo $MODEL_FILE" >&2; exit 1; }

ffmpeg -v error -y -i "$INPUT" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$WAV"

# -ml 1 -sow: un segmento por palabra; -ojf: JSON con tiempos en milisegundos
LD_LIBRARY_PATH="whisper.cpp/build/bin" "$CLI" \
  -m "$MODEL_FILE" -f "$WAV" -l "$LANG_CODE" \
  -ml 1 -sow -ojf -of "$OUT_BASE" -np

node - "$OUT_BASE.json" "public/${NAME}.captions.json" <<'EOF'
const fs = require("fs");
const [src, dst] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const captions = raw.transcription
  .map((s) => ({
    text: s.text,
    startMs: s.offsets.from,
    endMs: s.offsets.to,
    timestampMs: null,
    confidence: null,
  }))
  .filter((c) => c.text.trim().length > 0);
fs.writeFileSync(dst, JSON.stringify(captions, null, 2));
console.log(`${captions.length} palabras -> ${dst}`);
EOF

rm -f "$WAV" "$OUT_BASE.json"
