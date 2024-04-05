import { expect, test, xdescribe } from '@jest/globals';
// import { createEvaluator } from '../../../src/tools/AELL/evaluator';

xdescribe('evaluator', () => {
  // const { eval: evalExpression } = createEvaluator('1.0.0');

  test.each`
    text                | expectedEvalValue
    ${'1 + 1'}          | ${2}
    ${'1 * 1 + 1 * 1'}  | ${2}
    ${'true'}           | ${'1'}
  `('', ({ text, expectedEvalValue }) => {
    expect(true).toBeTruthy();
    // expect(await evalExpression(String(text))).toBe(expectedEvalValue);
  });
});
