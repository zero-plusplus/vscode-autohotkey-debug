import { describe, expect, test } from '@jest/globals';
import * as path from 'path';
import { NamedNodeBase, SymbolFinder } from '../../src/v1-0-0/util/SymbolFinder';

const sampleDir = path.resolve(`${__dirname}/sample`);

describe('SymbolFinder', () => {
  const finder = new SymbolFinder('1.1.35.0');
  test('v1', () => {
    const result = finder.find(`${sampleDir}/A.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    expect(result[0].fullname).toBe('Lib_Test');
    expect(result[1].fullname).toBe('Func_1');
    expect(result[2].fullname).toBe('Func_2');
    expect(result[3].fullname).toBe('A.B.Accessor_1.get');
    expect(result[4].fullname).toBe('A.B.Accessor_1.set');
    expect(result[5].fullname).toBe('A.B.Accessor_2.get');
    expect(result[6].fullname).toBe('A.B.B_Method_1');
    expect(result[7].fullname).toBe('A.B.B_Method_2');
    expect(result[8].fullname).toBe('A.A_Method_1.A_Method_1_Inner');
    expect(result[9].fullname).toBe('A.A_Method_1');
    expect(result[10].fullname).toBe('A.A_Method_2');
    expect(result[11].fullname).toBe('A.C.C_Method_1');
  });
});
