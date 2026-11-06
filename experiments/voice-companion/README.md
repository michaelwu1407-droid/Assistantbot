# Voice Companion

A hands-free voice chat companion that runs on your own machine. You talk, it answers out loud with a personality, and subtitles light up karaoke-style as it speaks. Web UI at `http://127.0.0.1:7860`.

```
mic ─► Silero VAD (in browser) ─► Whisper (faster-whisper) ─► LLM (llama.cpp) ─► TTS ─► speaker
                                                                   │ streamed, cut into sentences;
                                                                   └ each sentence is voiced as soon as it is ready
```

- **Low latency:** the reply streams from the LLM and is voiced one sentence at a time, so audio starts after the first clause instead of the whole answer.
- **Barge-in:** start talking while it speaks and it stops and listens. Untick "talk over her" to turn this off.
- **Hot swap:** edit `config.toml`, click **Reload**, and the next turn uses the new model, voice or persona.
- **Offline:** after setup, nothing leaves the machine. The page makes no external requests once `web/vendor` is populated.

## Quick start

```bash
cd experiments/voice-companion
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
./scripts/fetch_web_assets.sh        # one-off: vendors the browser VAD for offline use
cp config.example.toml config.toml
```

Try the UI with no models (canned replies, browser voice):

```bash
python -m server --demo
```

### Real models

1. **LLM:** run [llama.cpp](https://github.com/ggml-org/llama.cpp)'s server with any GGUF chat model:
   ```bash
   llama-server -m Qwen3-8B-Q4_K_M.gguf --port 8080 --jinja -ngl 99
   ```
   Ollama or LM Studio also work: point `[llm] base_url` at their OpenAI-compatible `/v1` endpoint.
2. **Speech-to-text:** included (faster-whisper). The model in `[stt] model` downloads on first start. A GPU is used automatically when CUDA is available.
3. **Voice:** set `[tts] backend = "openai"` and run any server exposing OpenAI's `/v1/audio/speech`, e.g. [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) (`docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu`) or a Qwen3-TTS wrapper. With `backend = "browser"` the browser's built-in voice speaks instead.
4. `python -m server`, open http://127.0.0.1:7860, tap the mic.

Rough VRAM: Whisper small ~1 GB, an 8B Q4 LLM ~6 GB, Kokoro ~1 GB. Smaller models give faster replies.

## Persona

Edit `[persona]` in `config.toml`: `name`, `user_name`, `system_prompt` (`{name}` and `{user_name}` are filled in), `max_history`. Drop an image into `web/` and set `avatar = "avatar.png"`.

## WebSocket protocol (`/ws`)

| Direction | Message |
|---|---|
| client → server | binary: one utterance, Float32 PCM, 16 kHz mono |
| client → server | `{"type":"text","text":"..."}` · `{"type":"interrupt"}` · `{"type":"reset"}` |
| server → client | `{"type":"state","state":"listening\|transcribing\|thinking\|speaking"}` (speaking carries `latency_ms`) |
| server → client | `{"type":"user","text"}` · `{"type":"sentence","id","text","audio":base64 WAV or null}` · `{"type":"done"}` · `{"type":"error","message"}` |

## Tests

```bash
pip install pytest && python -m pytest -q
```

## Layout

```
server/  config.py  stt.py  llm.py  tts.py  text.py (sentence chunking, <think> stripping)
         pipeline.py (one conversation turn)  app.py (FastAPI + websocket)  demo.py
web/     index.html  style.css  audio.js (playback queue, VAD loader)  app.js (UI + session)
```
