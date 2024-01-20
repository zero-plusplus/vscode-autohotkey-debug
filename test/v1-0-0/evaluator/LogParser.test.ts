import { describe, expect, test } from '@jest/globals';
import { LogParser, ParsedLogData } from '../../../src/v1-0-0/util/evaluator/LogParser';

const simplifyDataList = (dataList: ParsedLogData[]): any => {
  return dataList.map((data) => {
    return {
      ...data,
      prefixes: data.prefixes.map((prefix) => {
        return prefix.value;
      }),
    };
  });
};

describe('LogParser', () => {
  const parser = new LogParser();

  test('parse', () => {
    expect(simplifyDataList(parser.parse('{:startCollapsed:}A-A'))).toEqual([ { prefixes: [ 'startCollapsed' ], message: 'A-A' } ]);
    expect(simplifyDataList(parser.parse('{:break:}{:error:}label: {str_alpha}{:break:}'))).toEqual([
      { prefixes: [ 'break', 'error' ], message: 'label: {str_alpha}' },
      { prefixes: [ 'break' ], message: '' },
    ]);
    expect(simplifyDataList(parser.parse('abc{:break:}abc'))).toEqual([
      { prefixes: [], message: 'abc' },
      { prefixes: [ 'break' ], message: 'abc' },
    ]);
  });
});
