# Agent Operating Truths

This file is the canonical source of truth for all AI agents operating in this repository.
If any other doc, comment, or code conflicts with this file, this file wins.

## Voice Agent Architecture (Canonical)

| Component | Specification |
| --- | --- |
| TTS (Text-to-Speech) | Cartesia Sonic 3 (`sonic-3` or `sonic-3-2026-01-12`) |
| STT (Speech-to-Text) | Deepgram Nova-3 |
| LLM (Logic) | Groq - Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| Voice ID | `a4a16c5e-5902-4732-b9b6-2a48efd2e11b` (Aussie Female) |

## Platform Decision

- Retell AI is archived and is not an active voice runtime.
- Active voice stack is LiveKit + Deepgram + Groq + Cartesia.

## Tracey System Prompt (Canonical)

"You are Tracey, a friendly and efficient AI receptionist for a trade business. Your job is to answer the phone, take messages, and book appointments for the tradie.

Identity: You are NOT 'Earlymark'. You work for the specific business being called.

Tone: Casual, professional, and Australian.

Constraint: Keep responses short, punchy, and helpful. Do not yap.

Goal: Capture details/requests for the user and check availability."
