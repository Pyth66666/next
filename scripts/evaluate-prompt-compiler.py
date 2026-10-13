"""Paired DSPy requirement-comprehension evaluation. Offline dry run by default.

Uses the same coding model and questions for original and compiled prompts.
This is a comprehension screen, not an end-to-end MVP build benchmark.
No training, automatic deployment, or provider calls without --run-model-eval.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def validate_rows(rows):
    if not isinstance(rows, list) or not rows:
        raise ValueError('Provide a non-empty JSON array of evaluation cases.')
    identifiers = set()
    for row in rows:
        if not isinstance(row, dict) or any(not isinstance(row.get(key), str) or not row[key].strip()
                                            for key in ('id', 'group', 'source', 'candidate', 'question', 'answer')):
            raise ValueError('Each case needs id, group, source, candidate, question and answer strings.')
        if row['id'] in identifiers:
            raise ValueError('Evaluation case IDs must be unique.')
        identifiers.add(row['id'])
        if len(row['source']) > 30000 or len(row['candidate']) > 150000:
            raise ValueError('Evaluation prompt exceeds the compiler limits.')
    return rows


def load_rows(dataset=None):
    if dataset:
        return validate_rows(json.loads(Path(dataset).read_text(encoding='utf-8-sig')))
    result = subprocess.run(['node', str(ROOT / 'scripts' / 'prompt-eval-cases.mjs')],
                            cwd=ROOT, check=True, capture_output=True, encoding='utf-8')
    return validate_rows(json.loads(result.stdout))


def matches(answer, expected):
    # Gold questions ask for one exact value. Avoid an LLM judge and its extra cost.
    return isinstance(answer, str) and answer.strip().casefold() == expected.strip().casefold()


def evaluate_pairs(rows, predict):
    results = []
    for index, row in enumerate(rows):
        scores = {}
        # Alternate order to reduce systematic first/second-call effects.
        order = ('source', 'candidate') if index % 2 == 0 else ('candidate', 'source')
        for variant in order:
            scores[variant] = matches(predict(row[variant], row['question']), row['answer'])
        results.append({'id': row['id'], 'group': row['group'],
                        'originalPass': scores['source'], 'candidatePass': scores['candidate']})
    regressions = [row['id'] for row in results if row['originalPass'] and not row['candidatePass']]
    failures = [row['id'] for row in results if not row['candidatePass']]
    return {'cases': len(results), 'baselinePassRate': sum(r['originalPass'] for r in results) / len(results),
            'candidatePassRate': sum(r['candidatePass'] for r in results) / len(results),
            'regressions': regressions, 'candidateFailures': failures,
            'comprehensionGatePassed': not failures, 'results': results,
            'limitation': 'Curated comprehension probes only. Requires separate paired builds, security tests and total usage measurement before claiming equal build quality.'}


def create_predictor(model, max_model_calls):
    os.environ.setdefault('DSPY_CACHEDIR', str(ROOT / 'tmp' / 'dspy-cache'))
    import dspy  # Optional; dry runs and evaluator unit tests never import it.
    dspy.configure_cache(enable_disk_cache=False, enable_memory_cache=False)

    class BudgetedLM(dspy.LM):
        def __init__(self):
            super().__init__(model, temperature=0, max_tokens=128, cache=False, num_retries=0)
            self.attempts = 0

        def __call__(self, *args, **kwargs):
            if self.attempts >= max_model_calls:
                raise RuntimeError('Model invocation limit reached.')
            self.attempts += 1
            return super().__call__(*args, **kwargs)

    class CheckRequirement(dspy.Signature):
        """Read the builder prompt as a specification. Answer only the question in its requested format. Do not build the app or invent missing requirements."""
        builder_prompt: str = dspy.InputField()
        question: str = dspy.InputField()
        answer: str = dspy.OutputField()

    lm = BudgetedLM()
    student = dspy.Predict(CheckRequirement)

    def predict(prompt, question):
        with dspy.context(lm=lm):
            return student(builder_prompt=prompt, question=question).answer
    return predict, lm


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', help='Optional JSON array of synthetic/consented cases; defaults to bundled fixtures.')
    parser.add_argument('--model', help='Explicit DSPy provider/model identifier. No default model is chosen.')
    parser.add_argument('--max-model-calls', type=int, default=0,
                        help='Maximum LM invocations, including adapter retries; not a monetary spending cap.')
    parser.add_argument('--run-model-eval', action='store_true')
    args = parser.parse_args(argv)
    try:
        rows = load_rows(args.dataset)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        parser.error(str(error))
    required = 2 * len(rows)
    if not args.run_model_eval:
        print(json.dumps({'cases': len(rows), 'modelCalls': 0, 'minimumCallsForPairedEvaluation': required,
                          'groups': sorted({row['group'] for row in rows}),
                          'status': 'Dry run passed. Provider calls require --run-model-eval, --model and an explicit --max-model-calls budget.'}, indent=2))
        return 0
    if not args.model or args.max_model_calls < required:
        parser.error(f'Model evaluation requires --model and --max-model-calls of at least {required}. Calls may cost money.')
    lm = None
    try:
        predict, lm = create_predictor(args.model, args.max_model_calls)
        report = evaluate_pairs(rows, predict)
        report.update({'model': args.model, 'modelCalls': lm.attempts,
                       'providerUsage': [entry.get('usage') for entry in lm.history if entry.get('usage')],
                       'deployment': 'None. This tool never modifies application templates.'})
        print(json.dumps(report, indent=2))
        return 0 if report['comprehensionGatePassed'] else 1
    except Exception as error:
        # Provider exception messages may contain credentials or request content.
        print(json.dumps({'status': 'Evaluation incomplete; no quality claim or deployment.',
                          'errorType': type(error).__name__, 'modelCalls': lm.attempts if lm else 0}), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
