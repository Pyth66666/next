"""Standard-library tests. No DSPy installation, credentials, or model calls."""
import importlib.util
from pathlib import Path
import unittest
import sys
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from unittest.mock import patch

WITH_DSPY = '--with-dspy' in sys.argv
if WITH_DSPY:
    sys.argv.remove('--with-dspy')

spec = importlib.util.spec_from_file_location('evaluator', Path(__file__).with_name('evaluate-prompt-compiler.py'))
evaluator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluator)


class EvaluatorTests(unittest.TestCase):
    def cases(self):
        return [{'id': 'access', 'group': 'project-a', 'source': 'Original requirements',
                 'candidate': 'Compact requirements', 'question': 'Cross-user access?', 'answer': 'no'},
                {'id': 'budget', 'group': 'project-b', 'source': 'Original budget',
                 'candidate': 'Compact budget', 'question': 'Budget?', 'answer': '1000'}]

    def test_schema_rejects_missing_duplicate_and_empty_cases(self):
        for rows in [[], [{}], self.cases() + self.cases(), 'invalid']:
            with self.assertRaises(ValueError):
                evaluator.validate_rows(rows)
        self.assertEqual(len(evaluator.validate_rows(self.cases())), 2)

    def test_wrong_candidate_cannot_pass_on_token_savings(self):
        def predict(prompt, question):
            return 'yes' if prompt == 'Compact requirements' else ('no' if question == 'Cross-user access?' else '1000')
        result = evaluator.evaluate_pairs(self.cases(), predict)
        self.assertEqual(result['baselinePassRate'], 1)
        self.assertEqual(result['candidatePassRate'], .5)
        self.assertEqual(result['regressions'], ['access'])
        self.assertFalse(result['comprehensionGatePassed'])

    def test_baseline_failure_does_not_hide_candidate_failure(self):
        result = evaluator.evaluate_pairs(self.cases(), lambda *_: 'unknown')
        self.assertEqual(result['regressions'], [])
        self.assertEqual(result['candidateFailures'], ['access', 'budget'])
        self.assertFalse(result['comprehensionGatePassed'])

    def test_all_answers_checked_and_order_alternates(self):
        calls = []
        def predict(prompt, question):
            calls.append(prompt)
            return ' NO ' if question == 'Cross-user access?' else '1000'
        self.assertTrue(evaluator.evaluate_pairs(self.cases(), predict)['comprehensionGatePassed'])
        self.assertEqual(calls, ['Original requirements', 'Compact requirements', 'Compact budget', 'Original budget'])
        self.assertFalse(evaluator.matches('no, because...', 'no'))

    def test_dry_run_never_creates_model_even_if_model_and_budget_provided(self):
        with patch.object(evaluator, 'load_rows', return_value=self.cases()), patch.object(evaluator, 'create_predictor') as create, redirect_stdout(StringIO()):
            self.assertEqual(evaluator.main(['--model', 'fixture/model', '--max-model-calls', '100']), 0)
            create.assert_not_called()

    def test_budget_rejected_before_model_initialization(self):
        for argv in [['--run-model-eval'], ['--run-model-eval', '--model', 'fixture/model', '--max-model-calls', '3']]:
            with patch.object(evaluator, 'load_rows', return_value=self.cases()), patch.object(evaluator, 'create_predictor') as create, redirect_stderr(StringIO()):
                with self.assertRaises(SystemExit):
                    evaluator.main(argv)
                create.assert_not_called()

    def test_provider_failure_returns_incomplete_without_exposing_message(self):
        stderr = StringIO()
        with patch.object(evaluator, 'load_rows', return_value=self.cases()), patch.object(evaluator, 'create_predictor', side_effect=RuntimeError('SECRET')), redirect_stderr(stderr):
            result = evaluator.main(['--run-model-eval', '--model', 'fixture/model', '--max-model-calls', '4'])
        self.assertEqual(result, 1)
        self.assertNotIn('SECRET', stderr.getvalue())
        self.assertIn('incomplete', stderr.getvalue())

    @unittest.skipUnless(WITH_DSPY, 'Use --with-dspy for the installed-framework checks.')
    def test_real_dspy_adapter_parses_mock_response_and_enforces_budget(self):
        # Block sockets before constructing DSPy, regardless of credentials.
        with patch('socket.socket.connect', side_effect=AssertionError('Network forbidden')):
            predict, lm = evaluator.create_predictor('gemini/fixture-model', 1)
            import dspy
            with patch.object(dspy.LM, '__call__', return_value=['[[ ## answer ## ]]\nno\n\n[[ ## completed ## ]]']) as provider:
                self.assertEqual(predict('Owners only.', 'Cross-user access?'), 'no')
                with self.assertRaises(RuntimeError):
                    predict('Owners only.', 'Cross-user access?')
                self.assertEqual(lm.attempts, 1)
                self.assertEqual(provider.call_count, 1)
                self.assertEqual(lm.num_retries, 0)
                self.assertFalse(lm.cache)

    @unittest.skipUnless(WITH_DSPY, 'Use --with-dspy for the installed-framework checks.')
    def test_real_adapter_fallback_cannot_escape_budget(self):
        with patch('socket.socket.connect', side_effect=AssertionError('Network forbidden')):
            predict, lm = evaluator.create_predictor('gemini/fixture-model', 1)
            import dspy
            with patch.object(dspy.LM, '__call__', return_value=['invalid response']) as provider:
                with self.assertRaises(Exception):
                    predict('Owners only.', 'Cross-user access?')
                self.assertEqual(provider.call_count, 1)
                self.assertEqual(lm.attempts, 1)


if __name__ == '__main__':
    unittest.main()
