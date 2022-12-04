import { describe } from '@jest/globals';
import * as assert from 'assert';
import { ExpressionParser } from '../../src/util/evaluator/ExpressionParser';

describe('ExpressionParser for v1', () => {
  const parser = new ExpressionParser('1.1.35');
  test('v1-1', () => {
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
    ];
    for (const testData of testDataList) {
      const result = parser.parse(testData);
      assert.ok(result.succeeded(), result.message ? `${testData}\n${result.message}` : testData);
    }
  });
});
