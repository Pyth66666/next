# Builder prompt compiler v2

## Optional AI builder-plan pipeline

The Build dialog has two paths. The default, no-AI path constructs a handoff from the approved brief and reviewed template; **Optimize builder prompt** applies the deterministic compiler below. **Ask AI to plan this handoff** sends the approved brief once, with task and response-style metadata, to the configured Gemini or NVIDIA model. It requests at most three clarification questions and four implementation checks as JSON. Application code validates the schema and requires every check to cite an exact excerpt of the brief; it then inserts the original brief unchanged and displays a separate editable review. A failed or malformed AI answer leaves the existing prompt untouched. The user must apply the draft explicitly.

This is an efficiency framework, not simply a word-shortener. It avoids sending the entire duplicated handoff to the planner, compacts only a known wrapper, and counts the **final** handoff including AI additions. A useful project-specific check can increase the final handoff's token count. The UI shows the signed delta rather than promising savings. Provider-reported request usage, when available, is separate from the local reference handoff count; neither includes the external coding agent's full build session.

Every configured provider/model uses the same planning contract and safety validation. New models use the hand-reviewed baseline profile. `backend/builder-pipeline.mjs` accepts an exact provider/model profile only after a separately reviewed `held-out-reviewed` entry is registered; the registry is currently empty. The baseline's status explicitly says model quality is unvalidated. Checks are syntactically grounded but **not semantically proved correct**; users must review them. The pipeline does not assert that the resulting software will work.

DSPy remains an **offline evaluation tool**, not a dependency of the deployed Node server. To evaluate a proposed model/profile, collect synthetic or consented projects with independent gold requirement questions, run both baseline and candidate prompts through the same model using `scripts/evaluate-prompt-compiler.py --dataset ...` (the JSON format and explicit call budget are documented below), then assess downstream build acceptance, security, total token usage, retries and cost on a held-out project set. Only a profile that passes those gates should be manually added to the exact-match registry. The supplied six-project corpus is a development smoke test, not enough to tune a production profile. No live DSPy tuning or model-specific quality claim has been made under the **no paid calls** constraint.

Click **Optimize builder prompt** in Build or the builder-instructions dialog. The compiler compares the original against a compact, readable version of Apexelerate's reviewed builder template. It uses code and real token counts; it makes no generative AI call during compilation.

The user-approved brief stays character-for-character intact, including whitespace, numbers, permissions, negations and code. Only a recognized Apexelerate wrapper is rewritten. The compact wrapper preserves the reviewed scope, architecture, learning, security, testing and documentation instructions. Its original source is recoverable through the reviewed template mapping. This verifies text preservation and provenance; it does not prove equal behavior from a coding model.

`public/builder-template-snapshots.js` pins the reviewed source wrappers. A future template change or a custom wrapper falls back to the original until reviewed. Test/change prompts are left alone. Dictionary and JSON encodings require the advanced experimental checkbox; dictionary candidates are generated only when lines repeat. Decoder instructions and encoding overhead are included in counts.

The selected candidate must save at least **8 tokens and 2%** versus the original. Ties and smaller gains keep the original. If any count fails, the UI retains the original. **Use original** restores it. Editing a prompt, regenerating a task or changing options invalidates previous results. Stale success and error responses cannot overwrite newer text.

## Counters and access

- **Local o200k reference:** actual `js-tiktoken` o200k_base counting, including literal special-token spellings in code. No network or model call. It is a reference count, not the target Gemini/Claude model's count or a whole coding-session bill.
- **Configured Gemini:** explicitly selecting it sends candidate text to Google's `countTokens` API. Keys remain server-side. It does not generate an answer. Model-specific counts still exclude coding-tool schemas, output, conversation, retries and other overhead.

`POST /api/prompt/compile` requires sign-in, origin/CSRF validation, a non-empty source no longer than 30,000 characters and a per-account rate limit. Experimental mode accepts a boolean only. Compiler results do not replace saved briefs. The browser regenerates trusted candidates and checks response text, metadata and count consistency before applying a result. The optional comparison is separate from older character-based estimates elsewhere in the app.

## Reproduce the free benchmark

```sh
node scripts/benchmark-prompt-compiler.mjs
npm test
```

The bundled synthetic corpus has six project types in guided and concise styles. It covers access restrictions, budgets, upload sizes, consent, Malaysian localization, Unicode and exact code contracts. It excludes repeated-line stress fixtures from the headline result.

Local o200k_base results: **3,612 → 3,000 input tokens across 12 prompts (16.9% aggregate reduction)**. The six guided prompts save **25.4–26.8%**. Already-concise prompts keep their original text because their gains fall below the threshold. Three additional custom/modified/test-task cases keep the original. These numbers describe this small synthetic corpus; they are not a guarantee for all projects, target tokenizers or total build cost.

## Optional DSPy comprehension checks

The production compiler does not depend on Python or DSPy. The optional evaluator uses pinned `dspy==3.4.1` to compare the original and compiled prompts on the same requirement questions, using one explicitly selected model. It tests permissions, exact numeric limits, consent, time zones, code constraints and the wrapper's security/documentation obligations. Answers are checked against independent gold answers without an extra LLM judge. It alternates original/candidate order and reports both pass rates, individual regressions and candidate failures. Every candidate answer must pass its probe to pass this comprehension gate.

The earlier GEPA experiment optimized exact text decoding. That objective did not establish builder quality, so it has been replaced with paired comprehension evaluation. No DSPy-trained prompt is automatically deployed. GEPA tuning should only be added once an end-to-end build metric and a separate held-out project set exist.

Run with Python 3.10+ and Node 24:

```sh
python scripts/test-prompt-evaluator.py
python scripts/evaluate-prompt-compiler.py
```

The default dry run generates **48 probes from six synthetic projects**, validates the dataset and makes **zero model calls**. It requires neither DSPy nor credentials. An optional `--dataset path.json` accepts a non-empty JSON array with unique `id`, `group`, `source`, `candidate`, `question` and `answer` strings. Use only synthetic or consented data. The included fixtures are development probes, not an unbiased held-out build benchmark.

Implementation verification: **49 application tests and 9 Python evaluator tests passed**. The Python checks include the installed DSPy 3.4.1 adapter parsing a mocked response and enforcing its invocation limit during adapter fallback, with socket connections blocked. To repeat those two framework checks after installing the optional dependency, run `python scripts/test-prompt-evaluator.py --with-dspy`. No live inference was used.

On this Windows workspace, an isolated, signed Python 3.13.9 runtime and DSPy installation are available under the ignored `tmp/python-eval/` folder. Use `.\tmp\python-eval\python.exe` in place of `python` for these commands. This temporary runtime is not committed or deployed; it does not change system Python. Regenerate it or use your own isolated environment on another computer.

Only after explicitly approving model costs, install `scripts/prompt-eval-requirements.txt` in an isolated Python environment, configure the chosen provider's credentials through its environment variables, and run:

```sh
python scripts/evaluate-prompt-compiler.py --run-model-eval --model PROVIDER/MODEL --max-model-calls 96
```

The bundled set requires at least 96 LM invocations. The guard includes adapter fallback calls; provider retries are disabled. The invocation limit is not a monetary cap. Responses have a 128-token output limit. Provider usage is reported when available. A provider, parser or budget error reports an incomplete evaluation; it cannot pass the quality gate. The tool never changes templates or deploys code.

Comprehension results do not demonstrate a working MVP. Before claiming equivalent build quality or total savings, run repeated paired builds from identical repositories with the same tools/model settings. Check project acceptance and security tests, failures, mobile behavior, total input/output/thinking tokens, retries and cost. Keep a separate held-out project set for the final assessment. Live model evaluation remains deferred under the user's **no paid calls** constraint.
