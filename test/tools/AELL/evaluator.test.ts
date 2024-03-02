import { describe, expect, test } from '@jest/globals';
import { createEvaluator } from '../../../src/tools/AELL/evaluator';

describe('evaluator', () => {
  const { eval: evalExpression } = createEvaluator('1.0.0');

  test.each`
    text                | expectedEvalValue
    ${'1 + 1'}          | ${2}
    ${'1 * 1 + 1 * 1'}  | ${2}
    ${'true'}           | ${'1'}
  `('', async({ text, expectedEvalValue }) => {
    expect(await evalExpression(String(text))).toBe(expectedEvalValue);
  });
});
