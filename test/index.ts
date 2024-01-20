import { describe, test } from '@jest/globals';
import * as assert from 'assert';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { splitVariablePath } from '../src/v1-0-0/util/util';

describe('splitVariablePath', () => {
  test('v1', () => {
    const ahkVersion = new AhkVersion('1.1.00');
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
    const ahkVersion = new AhkVersion('2.0.00');
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a'), [ 'a' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, 'a.b'), [ 'a', 'b' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, `a.b['c']`), [ 'a', 'b', `['c']` ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, `a.b['c'].d`), [ 'a', 'b', `['c']`, 'd' ]);
    assert.deepStrictEqual(splitVariablePath(ahkVersion, `a['\`'b.B\`'']['c'].d`), [ 'a', `['\`'b.B\`'']`, `['c']`, 'd' ]);
  });
});
