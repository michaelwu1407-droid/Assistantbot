"""First-run downloads, so setup is just: pip install, start an LLM, python -m server.

- web/vendor: the browser voice detector (Silero VAD + ONNX Runtime) from the npm registry, so
  the page works offline afterwards.
- models/: the Kokoro voice (official fp32 ONNX + voices) from the kokoro-onnx releases.
Each download reports progress to a callback and is atomic (written to .part, then renamed).
"""
from __future__ import annotations

import io
import logging
import tarfile
import urllib.request
from pathlib import Path
from typing import Callable

from .config import ROOT, TTSConfig, resolve

log = logging.getLogger("voice-companion")
Progress = Callable[[str], None]

NPM = "https://registry.npmjs.org"
WEB_PACKAGES = {  # package tarball -> files to copy from its dist/
    f"{NPM}/@ricky0123/vad-web/-/vad-web-0.0.29.tgz":
        ["bundle.min.js", "vad.worklet.bundle.min.js", "silero_vad_v5.onnx", "silero_vad_legacy.onnx"],
    f"{NPM}/onnxruntime-web/-/onnxruntime-web-1.22.0.tgz":
        ["ort.wasm.min.js", "ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"],
}
KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"


def _fetch(url: str, progress: Progress, label: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        buf, done, last = io.BytesIO(), 0, -1
        while chunk := resp.read(1 << 20):
            buf.write(chunk)
            done += len(chunk)
            pct = int(done * 100 / total) if total else -1
            if pct != last and (pct % 5 == 0 or pct < 0):
                progress(f"downloading {label} {pct}%" if pct >= 0 else f"downloading {label} {done >> 20} MB")
                last = pct
        return buf.getvalue()


def _save(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(path)


def ensure_web_assets(progress: Progress = log.info) -> bool:
    """True when web/vendor is complete. Missing files are fetched; failures leave the CDN fallback."""
    out = ROOT / "web" / "vendor"
    try:
        for url, files in WEB_PACKAGES.items():
            if all((out / f).is_file() for f in files):
                continue
            data = _fetch(url, progress, "voice detector")
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
                for f in files:
                    member = tar.extractfile(f"package/dist/{f}")
                    if member is None:
                        raise FileNotFoundError(f)
                    _save(out / f, member.read())
        return True
    except Exception as exc:
        log.warning("couldn't fetch the voice detector (%s); the page will load it from the CDN", exc)
        return False


def kokoro_missing(cfg: TTSConfig) -> list[tuple[str, Path]]:
    pairs = [("kokoro-v1.0.onnx", resolve(cfg.kokoro_model)), ("voices-v1.0.bin", resolve(cfg.kokoro_voices))]
    return [(name, path) for name, path in pairs if not path.is_file()]


def ensure_kokoro(cfg: TTSConfig, progress: Progress = log.info) -> None:
    """Download the official Kokoro files the config points at. Raises with a readable reason."""
    for name, path in kokoro_missing(cfg):
        try:
            _save(path, _fetch(f"{KOKORO}/{name}", progress, "her voice"))
        except Exception as exc:
            raise RuntimeError(f"couldn't download her voice ({exc}). Check your connection, or run "
                               "scripts/download_models.sh") from exc
