# Voice Companion

A hands-free voice companion that runs entirely on your machine. Switch the mic on, she says hi, and you just talk. She answers out loud with a personality, and subtitles light up karaoke-style as she speaks.

```
mic ─► Silero VAD (browser) ─► Whisper ─► LLM (llama.cpp / Ollama / LM Studio) ─► Kokoro voice ─► speaker
                                            └ streamed and voiced one sentence at a time
```

## Setup

```bash
cd experiments/voice-companion
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
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

Open http://127.0.0.1:7860 and press **Space** or tap the mic. On first start she talks with the
browser's voice while her own (Kokoro, ~350 MB) downloads, then switches over by herself; the
voice detector is fetched too, so the page works offline afterwards. Whisper downloads itself.

No models yet? `python -m server --demo` shows the UI with canned replies.

## Using it

- **Talk naturally.** She replies when you pause.
- **Cut in any time.** Her voice dips as soon as you start talking, and she stops once it's clearly you. Coughs and her own echo don't count. She only remembers the part of her reply you actually heard. Untick "Let me interrupt" to turn this off.
- **Esc** stops her. **New chat** clears her memory and she greets you again.
- The dots under her name show **Ears** (speech recognition), **Mind** (LLM) and **Voice**. If one is red, a banner says what to do. When you start the LLM server she reconnects by herself.
- Chinese works too: Whisper detects the language on your first sentence and Chinese sentences switch to a Chinese voice.

## Personalising

Copy `config.example.toml` to `config.toml`. `[persona]` sets her name, your name, nicknames, personality, greeting and avatar (put an image in `web/` and set `avatar = "me.png"`). `[tts] pronounce` fixes names the voice says wrong (`Kobe = "Koh-bee"`). Press the refresh button in the UI to apply changes, including model or voice swaps, without restarting.

## Speed

Measured from the moment you stop talking to her first sound, on a 4-vCPU cloud machine with **no GPU**
(Whisper small, Qwen3-0.6B, Kokoro fp32): **3.3 s**, of which speech recognition 1.3 s, the LLM's
first clause 0.9 s, voicing it 0.7 s. No silent gaps between her sentences.

What the code does to keep this low, on any hardware:

- Starts transcribing and replying 160 ms into your pause, while the browser waits out its 600 ms
  "are you done?" window; the reply is held until you're confirmed done and dropped if you carry on.
- While you listen to her, the LLM pre-reads the conversation so your next turn costs only your new words.
- Replies stream sentence by sentence and are capped at two sentences.

With a GPU the same pipeline is far faster, but that was not measured here. On CPU, Whisper
`model = "auto"` uses `base` (about 3× faster than `small`). Use the **fp32** Kokoro model the app downloads; the
int8 one is 4× slower on CPU.

## Scorecard

`eval/` scores the whole experience 0–5 on six dimensions from measured numbers (rubric in
`eval/RUBRIC.md`), with the real models, a real browser and synthetic speech:

```bash
python -m eval.run              # app (python -m server) and its LLM must be running
```

It writes `eval/results/latest.md` (scores, every reply she gave, every transcript) and appends to
`eval/results/history.md`. Unit tests: `pip install pytest && python -m pytest -q`.

## How it fits together

| File | Role |
|---|---|
| `server/stt.py` | Whisper: name hints, detect-once language, drops phantom phrases Whisper invents from noise ("Thanks for watching") |
| `server/llm.py` | finds the LLM server and model, streams tokens, skips Qwen3 "thinking" |
| `server/tts.py` | Kokoro in-process (default), OpenAI-compatible TTS server, or browser voice |
| `server/text.py` | cuts the token stream into speakable sentences; strips `<think>` and markdown |
| `server/pipeline.py` | one turn: LLM → sentences → voice, overlapped; trims memory after interruptions |
| `server/engine.py`, `session.py`, `app.py` | model loading and health, websocket session (incl. speculative start), routes |
| `server/assets.py` | first-run downloads: voice detector files and the Kokoro voice |
| `web/` | `audio.js` playback queue, `ui.js` rendering, `app.js` mic, speculation and echo-aware interruption |
| `eval/` | the scorecard: rubric, corpus, hearing/character/latency evaluators, browser checks |

WebSocket `/ws`: the browser sends one utterance as Float32 PCM (16 kHz mono) or `{"type":"text"|"interrupt"|"reset"|"greet"}`. The server sends `state`, `user`, `sentence` (`text`, base64 WAV `audio`), `done` and `error`. Reply messages carry a `turn` number so the page can drop audio from a reply it already cut off.
