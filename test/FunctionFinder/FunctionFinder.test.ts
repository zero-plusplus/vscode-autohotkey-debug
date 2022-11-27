import * as assert from 'assert';
import * as path from 'path';
import { FunctionFinder, NamedNodeBase } from '../../src/util/FunctionFinder';

const sampleDir = path.resolve(`${__dirname}/sample`);

suite('FunctionFinder', () => {
  test('v1', () => {
    const finder = new FunctionFinder(`${sampleDir}/A.ahk`, '1.1.35.0');
    const result = finder.find().filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as NamedNodeBase[];

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
});
