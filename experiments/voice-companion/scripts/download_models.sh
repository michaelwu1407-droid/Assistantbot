#!/usr/bin/env bash
# One-off: fetch the built-in Kokoro voice (~340 MB) into models/.
# Whisper downloads itself on first start; the LLM runs in llama.cpp / Ollama / LM Studio.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p models
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  if [ -s "models/$f" ]; then echo "models/$f already there"; continue; fi
  echo "Downloading $f…"
  curl -fL --progress-bar -o "models/$f.part" "$BASE/$f"
  mv "models/$f.part" "models/$f"
done
echo "Done. Start with: python -m server"
