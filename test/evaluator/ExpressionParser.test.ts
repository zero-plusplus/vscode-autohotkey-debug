import { describe } from '@jest/globals';
import * as assert from 'assert';
import { ExpressionParser } from '../../src/util/evaluator/ExpressionParser';

describe('ExpressionParser', () => {
  const parser = new ExpressionParser();
  const testDataList = [
    '+1',
    '-1',
    '!1',
    '&1',
    '"abc"',
    '"`,`%`;`::`r`n`b`t`v`a`f"',
    '(+1)',
    'this',
    '1 + 1 - 1 * 1 / 1',
    'num - 123',
    'true ? true : false',
    'obj.member',
    'obj.member[3]',
    'arr[3]',
    'arr[3, 4]',
    'func()',
  ];
  test('parse', () => {
    for (const testData of testDataList) {
      const result = parser.parse(testData);
      assert.ok(result.succeeded(), result.message ? `${testData}\n${result.message}` : testData);
    }
  });
});
