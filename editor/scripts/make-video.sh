#!/usr/bin/env bash
# Voz → render → verificación → hoja de revisión, de un vídeo «Story» o «Explainer».
#
# Uso:   scripts/make-video.sh <story|explainer> <slug> [--skip-voice]
# Salida: out/<slug>.mp4  y  out/<slug>-hoja.png (un fotograma por escena, para revisar a ojo)
set -euo pipefail
cd "$(dirname "$0")/.."

KIND="${1:?Uso: scripts/make-video.sh <story|explainer> <slug> [--skip-voice]}"
SLUG="${2:?Falta el slug}"
case "$KIND" in
  story) COMP="Story" ;;
  explainer) COMP="Explainer" ;;
  *) echo "El tipo debe ser story o explainer" >&2; exit 1 ;;
esac
DIR="public/$KIND/$SLUG"
[ -f "$DIR/script.json" ] || { echo "No existe $DIR/script.json" >&2; exit 1; }
[ -x .venv/bin/python ] || { echo "Falta el entorno de voz: npm run explainer:setup" >&2; exit 1; }
mkdir -p out

if [ "${3:-}" != "--skip-voice" ]; then
  echo "▸ Voz y tiempos…"
  .venv/bin/python scripts/explainer/build-voice.py "$SLUG" --kind "$KIND" 2>&1 | grep -v -i "HF Hub"
fi

echo "▸ Render de $COMP «$SLUG»…"
npx remotion render "$COMP" "out/$SLUG.mp4" --props="{\"slug\":\"$SLUG\"}" --concurrency=4 --crf=18 2>&1 | grep -E "Encoded 1|rror" | tail -2 || true

echo "▸ Verificación…"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "out/$SLUG.mp4"
ffmpeg -hide_banner -i "out/$SLUG.mp4" -af volumedetect -vn -f null - 2>&1 | grep -E "mean_volume|max_volume" || true

echo "▸ Hoja de revisión…"
python3 - "$DIR/timing.json" "out/$SLUG.mp4" "out/$SLUG-hoja.png" <<'PY'
import json, subprocess, sys, tempfile, os
from PIL import Image
timing, video, out = sys.argv[1:4]
t = json.load(open(timing))
tmp = tempfile.mkdtemp()
files = []
for i, s in enumerate(t["scenes"]):
    at = s["start"] + 0.72 * (s["end"] - s["start"])  # cuando ya han salido casi todos los elementos
    f = os.path.join(tmp, f"{i:02d}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.2f}", "-i", video, "-frames:v", "1", "-vf", "scale=432:-1", f], check=True)
    files.append(f)
ims = [Image.open(f).convert("RGB") for f in files]
w, h = ims[0].size
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
sheet.save(out)
print(f"{len(ims)} escenas → {out}")
PY
echo "✔ out/$SLUG.mp4"
