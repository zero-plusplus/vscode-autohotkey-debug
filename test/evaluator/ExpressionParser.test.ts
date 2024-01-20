import { describe, expect, test } from '@jest/globals';
import { ExpressionParser } from '../../src/v1-0-0/util/evaluator/ExpressionParser';

describe('ExpressionParser', () => {
  const parser = new ExpressionParser('1.1.36.00');
  const testDataList = [
    '0',
    '1.0',
    '1.0e4',
    '1.0e+4',
    '1.0e-4',
    '0x123',
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
    'obj["member"][3]',
    'arr[3]',
    'arr[3, 4]',
    'arr[3][4]',
    'func()',
    '1 < 2',
    '1 <= 2',
    '1 > 2',
    '1 >= 2',
    'true && false',
    'true || false',
    'GetMetaVar("thisCallstack").name',
    'GetMetaVar("callstack")[0].name',
  ];
  test.skip('parse', () => {
    for (const testData of testDataList) {
      const result = parser.parse(testData);
      if (!result.succeeded()) {
        console.log(result.message ? `${testData}\n${result.message}` : testData);
      }
      expect(result.succeeded()).toBeTruthy();
    }
  });
});
