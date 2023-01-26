import { describe, expect, test } from '@jest/globals';
import * as path from 'path';
import { NamedNodeBase, SymbolFinder } from '../../src/util/SymbolFinder';

const sampleDir = path.resolve(`${__dirname}/sample`);

describe('SymbolFinder', () => {
  const finder = new SymbolFinder('1.1.35.0');
  test('v1-1', () => {
    const result = finder.find(`${sampleDir}/A.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    expect(result[0].fullname).toBe('A.B.Accessor_1.get');
    expect(result[1].fullname).toBe('A.B.Accessor_1.set');
    expect(result[2].fullname).toBe('A.B.Accessor_2.get');
    expect(result[3].fullname).toBe('A.B.B_Method_1');
    expect(result[4].fullname).toBe('A.B.B_Method_2');
    expect(result[5].fullname).toBe('A.A_Method_1.A_Method_1_Inner');
    expect(result[6].fullname).toBe('A.A_Method_1');
    expect(result[7].fullname).toBe('A.A_Method_2');
    expect(result[8].fullname).toBe('A.C.C_Method_1');
    expect(result[9].fullname).toBe('Func_1');
    expect(result[10].fullname).toBe('Func_2');
  });
  test('v1-2', () => {
    const result = finder.find(`${__dirname}/../../demo/demo.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    expect(result[0].fullname).toBe('Util_CreateLargeArray');
    expect(result[1].fullname).toBe('Util_CreateGiantArray');
    expect(result[2].fullname).toBe('Util_CreateMaxSizeArray');
    expect(result[3].fullname).toBe('demo');
    expect(result[4].fullname).toBe('Clazz.property.get');
    expect(result[5].fullname).toBe('Clazz.property.set');
    expect(result[6].fullname).toBe('Clazz.method');
  });
});
