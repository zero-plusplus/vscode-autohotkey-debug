import * as assert from 'assert';
import { splitVariablePath } from '../src/util/stringUtils';

suite('splitVariablePath', () => {
  test('v1', () => {
    const ahkVersion = 1;
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a'), [ 'a' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a.'), [ 'a', '' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a.b'), [ 'a', 'b' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a.b["c"]'), [ 'a', 'b', '["c"]' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a.b["c"].d'), [ 'a', 'b', '["c"]', 'd' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a["b.B"]["c"].d'), [ 'a', '["b.B"]', '["c"]', 'd' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a["""b.B"""]["c"].d'), [ 'a', '["""b.B"""]', '["c"]', 'd' ]);

    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a b.test'), [ 'a b', 'test' ]);
  });
  test('v2', () => {
    const ahkVersion = 2;
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a'), [ 'a' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a.b'), [ 'a', 'b' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, `a.b['c']`), [ 'a', 'b', `['c']` ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, `a.b['c'].d`), [ 'a', 'b', `['c']`, 'd' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, `a['\`'b.B\`'']['c'].d`), [ 'a', `['\`'b.B\`'']`, `['c']`, 'd' ]);
  });
});
