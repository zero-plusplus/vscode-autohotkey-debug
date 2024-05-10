import { describe, expect, test } from '@jest/globals';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { splitVariablePath } from '../src/util/util';

describe('splitVariablePath', () => {
  test('v1', () => {
    const ahkVersion = new AhkVersion('1.1.00');
    expect(splitVariablePath(ahkVersion, 'a')).toEqual([ 'a' ]);
    expect(splitVariablePath(ahkVersion, 'a.')).toEqual([ 'a', '' ]);
    expect(splitVariablePath(ahkVersion, 'a.b')).toEqual([ 'a', 'b' ]);
    expect(splitVariablePath(ahkVersion, 'a.b["c"]')).toEqual([ 'a', 'b', '["c"]' ]);
    expect(splitVariablePath(ahkVersion, 'a.b["c"].d')).toEqual([ 'a', 'b', '["c"]', 'd' ]);
    expect(splitVariablePath(ahkVersion, 'a["b.B"]["c"].d')).toEqual([ 'a', '["b.B"]', '["c"]', 'd' ]);
    expect(splitVariablePath(ahkVersion, 'a["""b.B"""]["c"].d')).toEqual([ 'a', '["""b.B"""]', '["c"]', 'd' ]);

    expect(splitVariablePath(ahkVersion, 'a b.test')).toEqual([ 'a b', 'test' ]);
  });
  test('v2', () => {
    const ahkVersion = new AhkVersion('2.0.00');
    expect(splitVariablePath(ahkVersion, 'a')).toEqual([ 'a' ]);
    expect(splitVariablePath(ahkVersion, 'a.b')).toEqual([ 'a', 'b' ]);
    expect(splitVariablePath(ahkVersion, `a.b['c']`)).toEqual([ 'a', 'b', `['c']` ]);
    expect(splitVariablePath(ahkVersion, `a.b['c'].d`)).toEqual([ 'a', 'b', `['c']`, 'd' ]);
    expect(splitVariablePath(ahkVersion, `a['\`'b.B\`'']['c'].d`)).toEqual([ 'a', `['\`'b.B\`'']`, `['c']`, 'd' ]);
  });
});
