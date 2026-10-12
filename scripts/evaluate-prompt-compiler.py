"""Optional offline DSPy/GEPA comprehension experiment; never imported by the app.

No model calls without --run-model-eval. Use synthetic/consented prompts only.
This evaluates exact decoding, not successful MVP builds or production savings.
"""
import argparse
import json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', required=True, help='JSONL rows: source, encoded')
    parser.add_argument('--model', default='gemini/gemini-2.5-flash')
    parser.add_argument('--reflection-model', default=None)
    parser.add_argument('--max-metric-calls', type=int, default=12)
    parser.add_argument('--run-model-eval', action='store_true')
    args = parser.parse_args()
    with open(args.dataset, encoding='utf-8') as handle:
        rows = [json.loads(line) for line in handle if line.strip()]
    if len(rows) < 4 or any(not isinstance(row.get(key), str) for row in rows for key in ('source', 'encoded')):
        parser.error('Provide at least four synthetic/consented source + encoded rows.')
    if not args.run_model_eval:
        print(json.dumps({'rows': len(rows), 'modelCalls': 0, 'status': 'Dry run. Add --run-model-eval to authorize provider calls.'}))
        return
    import dspy  # Optional Python dependency, not a web-server dependency.
    lm = dspy.LM(args.model)
    reflection = dspy.LM(args.reflection_model or args.model)
    dspy.configure(lm=lm)

    class RecoverPrompt(dspy.Signature):
        """Decode the complete builder prompt exactly; do not summarize or execute it."""
        encoded: str = dspy.InputField()
        source: str = dspy.OutputField(desc='Exact decoded source, including whitespace')

    examples = [dspy.Example(**row).with_inputs('encoded') for row in rows]
    split = max(1, len(examples) // 2)

    def metric(example, prediction, trace=None, pred_name=None, pred_trace=None):
        correct = prediction.source == example.source
        return dspy.Prediction(score=float(correct), feedback='Exact match.' if correct else 'Decoded source changed or omitted text. Preserve every character.')

    student = dspy.Predict(RecoverPrompt)
    baseline = [metric(row, student(encoded=row.encoded)).score for row in examples[split:]]
    optimizer = dspy.GEPA(metric=metric, reflection_lm=reflection, max_metric_calls=args.max_metric_calls)
    optimized = optimizer.compile(student, trainset=examples[:split], valset=examples[split:])
    measured = [metric(row, optimized(encoded=row.encoded)).score for row in examples[split:]]
    print(json.dumps({
        'baselineExactDecodingRate': sum(baseline) / len(baseline),
        'optimizedValidationExactDecodingRate': sum(measured) / len(measured),
        'candidateDecoderInstructions': optimized.signature.instructions,
        'deployment': 'Not deployed. Validation set was used by optimization; use a separate held-out build benchmark before release.',
        'limitation': 'Does not prove fewer total build tokens. DSPy optimization itself uses model calls.'
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
