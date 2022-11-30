import * as assert from 'assert';
import * as path from 'path';
import { NamedNodeBase, SymbolFinder } from '../../src/util/SymbolFinder';

const sampleDir = path.resolve(`${__dirname}/sample`);

suite('SymbolFinder', () => {
  test('v1-1', () => {
    const finder = new SymbolFinder('1.1.35.0');
    const result = finder.find(`${sampleDir}/A.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    assert.strictEqual(result[0].fullname, 'A.B.Accessor_1.get');
    assert.strictEqual(result[1].fullname, 'A.B.Accessor_1.set');
    assert.strictEqual(result[2].fullname, 'A.B.Accessor_2.get');
    assert.strictEqual(result[3].fullname, 'A.B.B_Method_1');
    assert.strictEqual(result[4].fullname, 'A.B.B_Method_2');
    assert.strictEqual(result[5].fullname, 'A.A_Method_1.A_Method_1_Inner');
    assert.strictEqual(result[6].fullname, 'A.A_Method_1');
    assert.strictEqual(result[7].fullname, 'A.A_Method_2');
    assert.strictEqual(result[8].fullname, 'A.C.C_Method_1');
    assert.strictEqual(result[9].fullname, 'Func_1');
    assert.strictEqual(result[10].fullname, 'Func_2');
  });
  test('v1-2', () => {
    const finder = new SymbolFinder('1.1.35.0');
    const result = finder.find(`${__dirname}/../../demo/demo.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    assert.strictEqual(result[0].fullname, 'Util_CreateLargeArray');
    assert.strictEqual(result[1].fullname, 'Util_CreateGiantArray');
    assert.strictEqual(result[2].fullname, 'Util_CreateMaxSizeArray');
    assert.strictEqual(result[3].fullname, 'demo');
    assert.strictEqual(result[4].fullname, 'Clazz.property.get');
    assert.strictEqual(result[5].fullname, 'Clazz.property.set');
    assert.strictEqual(result[6].fullname, 'Clazz.method');
  });
});
