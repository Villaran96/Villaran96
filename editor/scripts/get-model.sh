#!/usr/bin/env bash
# Descarga un modelo ggml de whisper.cpp a editor/models/ (requiere acceso a huggingface.co).
# Uso: scripts/get-model.sh [small|medium|large-v3-turbo|...]
set -euo pipefail
cd "$(dirname "$0")/.."
MODEL="${1:-small}"
mkdir -p models
curl -fL --retry 3 -o "models/ggml-${MODEL}.bin" \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${MODEL}.bin"
ls -lh "models/ggml-${MODEL}.bin"
