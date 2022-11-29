import * as assert from 'assert';
import * as path from 'path';
import { NamedNodeBase, SymbolFinder } from '../../src/util/SymbolFinder';

const sampleDir = path.resolve(`${__dirname}/sample`);

suite('SymbolFinder', () => {
  test('v1-1', () => {
    const finder = new SymbolFinder('1.1.35.0');
    const result = finder.find(`${sampleDir}/A.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    assert.strictEqual(result[0].name, 'B_Method_1');
    assert.deepStrictEqual(result[0].scope, [ 'A', 'B' ]);
    assert.strictEqual(result[1].name, 'B_Method_2');
    assert.deepStrictEqual(result[1].scope, [ 'A', 'B' ]);
    assert.strictEqual(result[2].name, 'A_Method_1');
    assert.deepStrictEqual(result[2].scope, [ 'A' ]);
    assert.strictEqual(result[3].name, 'A_Method_1_Inner');
    assert.deepStrictEqual(result[3].scope, [ 'A', 'A_Method_1' ]);
    assert.strictEqual(result[4].name, 'A_Method_2');
    assert.deepStrictEqual(result[4].scope, [ 'A' ]);
    assert.strictEqual(result[5].name, 'C_Method_1');
    assert.deepStrictEqual(result[5].scope, [ 'A', 'C' ]);
    assert.strictEqual(result[6].name, 'Func_1');
    assert.strictEqual(result[7].name, 'Func_2');
  });
  test('v1-2', () => {
    const finder = new SymbolFinder('1.1.35.0');
    const result = finder.find(`${__dirname}/../../demo/demo.ahk`).filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

    assert.strictEqual(result[0].name, 'Util_CreateLargeArray');
    assert.deepStrictEqual(result[0].scope, []);
    assert.strictEqual(result[1].name, 'Util_CreateGiantArray');
    assert.deepStrictEqual(result[2].scope, []);
    assert.strictEqual(result[2].name, 'Util_CreateMaxSizeArray');
    assert.deepStrictEqual(result[2].scope, []);
    assert.strictEqual(result[3].name, 'demo');
    assert.deepStrictEqual(result[3].scope, []);
    assert.strictEqual(result[4].name, 'method');
    assert.deepStrictEqual(result[4].scope, [ 'Clazz' ]);
  });
});
