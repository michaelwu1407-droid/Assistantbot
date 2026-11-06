#!/usr/bin/env bash
# Copies the Silero VAD (browser) + ONNX Runtime files into web/vendor so the
# page works with no internet. Needs npm once; afterwards everything is local.
set -euo pipefail
cd "$(dirname "$0")/.."
VAD=0.0.29
ORT=1.22.0
OUT=web/vendor
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
(cd "$TMP" && npm pack "@ricky0123/vad-web@$VAD" "onnxruntime-web@$ORT" >/dev/null 2>&1)
mkdir -p "$TMP/vad" "$TMP/ort"
tar xzf "$TMP"/ricky0123-vad-web-*.tgz -C "$TMP/vad"
tar xzf "$TMP"/onnxruntime-web-*.tgz -C "$TMP/ort"

cp "$TMP"/vad/package/dist/{bundle.min.js,vad.worklet.bundle.min.js,silero_vad_v5.onnx,silero_vad_legacy.onnx} "$OUT"/
cp "$TMP"/ort/package/dist/{ort.wasm.min.js,ort-wasm-simd-threaded.wasm,ort-wasm-simd-threaded.mjs} "$OUT"/
echo "Vendored VAD $VAD + onnxruntime-web $ORT into $OUT"
