# Voice Companion

A hands-free voice companion that runs entirely on your machine. Switch the mic on, she says hi, and you just talk. She answers out loud with a personality, and subtitles light up karaoke-style as she speaks.

```
mic ─► Silero VAD (browser) ─► Whisper ─► LLM (llama.cpp / Ollama / LM Studio) ─► Kokoro voice ─► speaker
                                            └ streamed and voiced one sentence at a time
```

## Setup (once)

```bash
cd experiments/voice-companion
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
./scripts/download_models.sh      # built-in voice (Kokoro, ~340 MB)
./scripts/fetch_web_assets.sh     # voice detector for the page, so it works offline
```

Start a language model. Any of these works; the app finds it by itself:

```bash
ollama run qwen3:8b               # Ollama
```
```bash
llama-server -m Qwen3-8B-Q4_K_M.gguf --port 8080 --jinja -ngl 99   # llama.cpp
```

Then:

```bash
python -m server
```

Open http://127.0.0.1:7860 and press **Space** or tap the mic. Whisper downloads on first start.

No models yet? `python -m server --demo` shows the UI with canned replies.

## Using it

- **Talk naturally.** She replies when you pause.
- **Cut in any time.** Her voice dips as soon as you start talking, and she stops once it's clearly you. Coughs and her own echo don't count. She only remembers the part of her reply you actually heard. Untick "Let me interrupt" to turn this off.
- **Esc** stops her. **New chat** clears her memory and she greets you again.
- The dots under her name show **Ears** (speech recognition), **Mind** (LLM) and **Voice**. If one is red, a banner says what to do. When you start the LLM server she reconnects by herself.
- Chinese works too: Whisper detects the language on your first sentence and Chinese sentences switch to a Chinese voice.

## Personalising

Copy `config.example.toml` to `config.toml`. `[persona]` sets her name, your name, personality, greeting and avatar (put an image in `web/` and set `avatar = "me.png"`). Press the refresh button in the UI to apply changes, including model or voice swaps, without restarting.

## Speed

Time from you finishing a sentence to hearing her is roughly speech recognition + the LLM's first clause + voicing that clause.

- **GPU:** around a second with an 8B model.
- **CPU-only:** expect several seconds.
  - Whisper defaults to `base` on CPU.
  - A 3–4B model helps.
  - Measured in a 4-vCPU cloud sandbox with no GPU, using Whisper small, Qwen3-0.6B and Kokoro: about 4–8 s per reply.
- The "replied in" readout under the orb shows your real numbers.

Very small models (under ~3B) break character and mix up who is who; 4B+ is recommended for the persona to hold.

## Tests

```bash
pip install pytest && python -m pytest -q
```

## How it fits together

| File | Role |
|---|---|
| `server/stt.py` | Whisper: name hints, detect-once language, drops phantom phrases Whisper invents from noise ("Thanks for watching") |
| `server/llm.py` | finds the LLM server and model, streams tokens, skips Qwen3 "thinking" |
| `server/tts.py` | Kokoro in-process (default), OpenAI-compatible TTS server, or browser voice |
| `server/text.py` | cuts the token stream into speakable sentences; strips `<think>` and markdown |
| `server/pipeline.py` | one turn: LLM → sentences → voice, overlapped; trims memory after interruptions |
| `server/engine.py`, `session.py`, `app.py` | model loading and health, websocket session, routes |
| `web/` | `audio.js` playback queue, `ui.js` rendering, `app.js` mic + interruption logic |

WebSocket `/ws`: the browser sends one utterance as Float32 PCM (16 kHz mono) or `{"type":"text"|"interrupt"|"reset"|"greet"}`. The server sends `state`, `user`, `sentence` (`text`, base64 WAV `audio`), `done` and `error`. Reply messages carry a `turn` number so the page can drop audio from a reply it already cut off.
