"""Load config.toml (falling back to config.example.toml)."""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Persona:
    name: str = "Aria"
    user_name: str = "friend"
    avatar: str = ""
    system_prompt: str = "You are {name}, a friendly voice companion."
    greet: bool = True
    max_history: int = 12

    def render_prompt(self) -> str:
        return self.system_prompt.strip().format(name=self.name, user_name=self.user_name)


@dataclass
class STTConfig:
    model: str = "auto"
    device: str = "auto"
    compute_type: str = "auto"
    language: str = ""


@dataclass
class LLMConfig:
    base_url: str = "auto"
    model: str = "auto"
    api_key: str = ""
    temperature: float = 0.8
    max_tokens: int = 160


@dataclass
class TTSConfig:
    backend: str = "auto"
    voice: str = "af_heart"
    voice_zh: str = "zf_xiaoxiao"
    speed: float = 1.05
    kokoro_model: str = "models/kokoro-v1.0.onnx"
    kokoro_voices: str = "models/voices-v1.0.bin"
    base_url: str = "http://127.0.0.1:8880/v1"
    model: str = "kokoro"
    api_key: str = ""


@dataclass
class Config:
    host: str = "127.0.0.1"
    port: int = 7860
    persona: Persona = field(default_factory=Persona)
    stt: STTConfig = field(default_factory=STTConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    tts: TTSConfig = field(default_factory=TTSConfig)


def resolve(path: str) -> Path:
    """Paths in config.toml are relative to the project folder."""
    p = Path(path).expanduser()
    return p if p.is_absolute() else ROOT / p


def _pick(cls, data: dict):
    known = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
    return cls(**known)


def config_path() -> Path:
    user = ROOT / "config.toml"
    return user if user.exists() else ROOT / "config.example.toml"


def load_config(path: Path | None = None) -> Config:
    raw = tomllib.loads((path or config_path()).read_text(encoding="utf-8"))
    server = raw.get("server", {})
    return Config(
        host=server.get("host", "127.0.0.1"),
        port=int(server.get("port", 7860)),
        persona=_pick(Persona, raw.get("persona", {})),
        stt=_pick(STTConfig, raw.get("stt", {})),
        llm=_pick(LLMConfig, raw.get("llm", {})),
        tts=_pick(TTSConfig, raw.get("tts", {})),
    )
