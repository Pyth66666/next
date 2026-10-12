# Lossless builder-prompt compiler

The compiler is code, not a generative agent. On explicit **Compare encodings**, it compares the exact original Markdown, a compact JSON line array, and a line dictionary with ordered references. It never paraphrases, drops requirements, truncates, changes code, or removes negations. Every candidate must reconstruct the original JavaScript string exactly. Decoder instructions and dictionary overhead are included in the token count. Ties keep the original.

Sign-in, CSRF/origin checks, a 30,000-character limit, and a per-account rate limit protect `POST /api/prompt/compile`. Results are not saved to projects or substituted into the readable brief. **Use original** restores the baseline. Editing the brief/task invalidates results; stale async results cannot overwrite newer text.

## Counters

- **reference-o200k:** real local `js-tiktoken` o200k_base tokenization. No generation or remote model call. This is a reference encoding count, NOT a Gemini or Claude count and NOT a full chat-session bill.
- **gemini:** the configured Gemini model's `countTokens` endpoint. Sends the prompt to Google only after the user selects this option and clicks Compare; credentials remain server-side. Counts all candidate text, not coding-agent tool definitions, conversation, output, or retries. No generateContent call.
- Counts are never substituted with characters/4. Counter errors retain the original. Existing legacy estimates elsewhere remain explicitly labeled estimates.

## What the guarantee does and does not mean

Exact string recovery is mechanically verified. That is NOT proof that a target model will obey an unfamiliar encoding equally well. Encoded candidates remain experimental until model-comprehension and end-to-end build tests pass. The UI discloses this and provides original fallback. Unique short prompts usually keep the original; repeated long lines are the main opportunity in v1. No blanket savings percentage is advertised. JSON encodings here are not called TOON; a TOON adapter would require its own parser and tests.

## Optional DSPy experiment

The production path has no DSPy dependency, training, or per-user generation calls. `scripts/evaluate-prompt-compiler.py` provides an offline GEPA experiment for exact decoding. Install its separate requirements in an isolated Python environment if desired. Create JSONL rows containing synthetic `source` and corresponding compiler `encoded` text, with at least four diverse examples.

Run `python scripts/evaluate-prompt-compiler.py --dataset <fixture.jsonl>` for a zero-model-call dry run. Add `--run-model-eval --model <provider/model> --reflection-model <provider/model>` only when explicitly authorizing provider calls and configuring credentials through environment variables. Optimization may cost money. Never use real user prompts without consent. Outputs are candidate decoder instructions only, never automatically imported into the application.

This harness tests exact decoding, not real MVP success. Its validation data is used for selection and is not an unbiased final test. Before promoting an encoding/template, evaluate a separate held-out set with repeated paired builds, identical starting repositories/tools/model settings, requirement and security tests, failure cases, total usage and retries. Include optimizer cost. Reject candidates with lower build quality even if input counts are smaller. No model-based experiment was run during implementation.

Implementation verification: 41 Node tests passed, including API authentication/CSRF, tokenizer counts, multilingual/code round trips, fallback, restored originals, tampered responses and stale requests. A synthetic ordinary builder prompt measured 502 → 502 o200k_base tokens (original retained). A deliberately repetitive 50-line fixture measured 550 → 159; this is a compression test, not representative build savings. Python is not installed in the implementation environment, so the optional DSPy script has not been executed or validated against an installed DSPy version.
