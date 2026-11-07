# Voice Companion scorecard

Each dimension is scored 0–5 from measured numbers, not opinion. `python -m eval.run` measures
everything automatically and writes `eval/results/latest.md`.

**Bar for "best in class": every dimension ≥ 4, with Responsiveness and Character at 5.**

| # | Dimension | Weight | What is measured | 5 | 4 | 3 | 2 | 1 |
|---|---|---|---|---|---|---|---|---|
| R | Responsiveness | 25% | p50 time from the user going quiet to her first sound, over 6 spoken turns paced like a real chat (the user hears her out, then speaks 0.5 s later) | ≤1.0s | ≤1.5s | ≤2.5s | ≤4s | ≤6s |
| C | Character | 25% | % of replies passing all persona checks (below): a fixed 12-turn script, run 3× from a fresh chat (36 replies) | ≥95% | ≥85% | ≥70% | ≥50% | ≥30% |
| H | Hearing | 15% | word error rate on 10 synthetic utterances in 4 voices (EN + ZH), names right, noise clips ignored | WER ≤5%, names 100%, noise 100% | ≤8% | ≤12% | ≤20% | ≤30% |
| T | Turn-taking | 15% | in-browser, 3 trials, the mic hears her real output at −10 dB (harsh speaker echo): user cuts in mid-sentence (median time until she stops); 8 s of her talking with no false cut-in from her own echo; speaking in her pauses handled; split sentences merged | 4/4 checks + reaction ≤400ms | 4/4 | 3/4 | 2/4 | 1/4 |
| B | Reliability | 10% | unit tests; LLM down → clear banner → auto-recovers; no console errors; reconnects after server restart | 4/4 | — | 3/4 | 2/4 | 1/4 |
| U | Look & setup | 10% | fits 1280×800 and iPhone 13 with no scrolling; status visible within 100ms of each event; setup commands to first chat | all + ≤4 commands | all | — | — | — |

## Character checks (per reply)

1. Short: ≤ 2 sentences and ≤ 35 words (it's speech).
2. Clean: no markdown, lists, emoji, stage directions like `*smiles*` or `(pouts)` (the voice would read them out).
3. In character: never "as an AI", "language model", "I don't have (any) feelings", or assistant-speak
   ("I can't help with that", "anything else I can assist you with").
4. Right roles: never uses her own name to address the user ("Hi Aria!", "…, Aria.").
5. Language match: Chinese in → Chinese out, English in → English out.
6. Memory: recalls a fact the user gave earlier in the chat.
7. Fresh: not a near-copy (>75% similar) of one of her earlier replies or of the prompt's example lines.

Revision note: v1 of these checks passed replies like "I can't help with that, let me know if
there's anything else I can assist you with" and roles swapped mid-sentence. v2 (above) catches them;
all scores in history.md from "iter1 (v2 checks)" onward use v2. v3 (from "iter7") also fails
spoken stage directions "(pouts)" and English→Chinese drift.

Not measured: whether a reply actually follows from what the user said (relevance). That needs an
LLM judge stronger than the model under test; none is available offline here. Read the Replies table.

## Honesty rules

- Hardware is reported with every run. Responsiveness and Character depend heavily on the GPU
  and the LLM size, so each run also states which part of the latency is code (VAD wait, queueing,
  gaps) and which is model compute.
- A dimension that can't be measured in the current environment is marked **not measured**, never guessed.
