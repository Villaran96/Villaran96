#!/usr/bin/env bash
# Prepara todo lo necesario para transcribir: clona y compila whisper.cpp y descarga el modelo.
# Es idempotente: lo que ya existe no se vuelve a descargar ni a compilar.
#
# Uso:  scripts/setup-whisper.sh [modelo=small]     (npm run setup:whisper -- medium)
#
# Requisitos del sistema: git, cmake, un compilador C++ (g++/clang) y ffmpeg.
# Red: github.com (clonar) y huggingface.co + su CDN (*.hf.co) para el modelo.
set -euo pipefail

cd "$(dirname "$0")/.."
MODEL="${1:-small}"

for tool in git cmake ffmpeg; do
  command -v "$tool" >/dev/null || { echo "Falta '$tool': instálalo primero." >&2; exit 1; }
done
command -v g++ >/dev/null || command -v c++ >/dev/null || command -v clang++ >/dev/null \
  || { echo "Falta un compilador C++ (g++ o clang++)." >&2; exit 1; }

if [ ! -d whisper.cpp ]; then
  echo "==> Clonando whisper.cpp"
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp whisper.cpp
fi

if [ ! -x whisper.cpp/build/bin/whisper-cli ]; then
  echo "==> Compilando whisper-cli (unos minutos)"
  cmake -S whisper.cpp -B whisper.cpp/build -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF
  cmake --build whisper.cpp/build -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)" --target whisper-cli
fi

if [ ! -f "models/ggml-${MODEL}.bin" ]; then
  echo "==> Descargando el modelo '${MODEL}'"
  bash scripts/get-model.sh "$MODEL"
fi

echo "Listo. Transcribe con: npm run transcribe -- public/<video>.mp4 ${MODEL} es"
