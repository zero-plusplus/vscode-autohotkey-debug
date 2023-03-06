import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import assert from 'assert';
import * as net from 'net';
import { ChildProcess } from 'child_process';
import * as path from 'path';
import * as dbgp from '../../src/dbgpSession';
import { EvaluatedValue, ExpressionEvaluator } from '../../src/util/evaluator/ExpressionEvaluator';
import { getFalse, getTrue } from '../../src/util/evaluator/functions';
import { MetaVariableValueMap } from '../../src/util/VariableManager';
import { closeSession, launchDebug } from '../util';
import { isFloat } from '../../src/util/util';

type ApiTester = (expression: string) => Promise<[ string | number, string | number, string ]>;
const createTestApi = (evaluator: ExpressionEvaluator): ApiTester => {
  return async(expression: string, actual?: any) => {
    const expected = await evaluator.eval(expression);
    if (expected === undefined) {
      throw Error(`The expected (\`${expression}\`) is undefined.`);
    }

    const key = expression.replaceAll('"', 2 <= evaluator.ahkVersion.mejor ? '`"' : '""');
    const actualExpression = `testResults["${key}"]`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const _actual = actual ?? await evaluator.eval(actualExpression);
    if (_actual === undefined) {
      throw Error(`The actual (\`${actualExpression}\`) is undefined.`);
    }
    const message = `${expression} == ${actualExpression}`;

    if (expected instanceof dbgp.ObjectProperty && _actual instanceof dbgp.ObjectProperty) {
      return [ _actual.address, expected.address, message ];
    }
    if (isFloat(expected) && isFloat(_actual)) {
      return [ expected.toFixed(6), expected.toFixed(6), message ];
    }
    if ((typeof expected === 'string' || typeof expected === 'number') && (typeof _actual === 'string' || typeof _actual === 'number')) {
      return [ _actual, expected, message ];
    }
    throw Error('The value does not correspond to the test.');
  };
};

const sampleDir = path.resolve(__dirname, 'ahk');
const hostname = '127.0.0.1';
describe('ExpressionEvaluator for AutoHotkey-v1', (): void => {
  let testApi: ApiTester;
  let process: ChildProcess;
  let server: net.Server | undefined;
  let session: dbgp.Session;
  let evaluator: ExpressionEvaluator;
  let true_ahk: EvaluatedValue;
  let false_ahk: EvaluatedValue;
  // let undefined_ahk: EvaluatedValue;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk'), 49154, hostname);
    process = data.process;
    server = data.server;
    session = data.session;
    await session.sendFeatureSetCommand('max_children', 10000);

    const metaVariableMap = new MetaVariableValueMap();
    metaVariableMap.set('hitCount', 1);
    metaVariableMap.set('callstack', [ { name: 'A' }, { name: 'B' } ]);
    evaluator = new ExpressionEvaluator(session, { metaVariableMap });
    testApi = createTestApi(evaluator);
    true_ahk = await getTrue(session);
    false_ahk = await getFalse(session);

    // undefined_ahk = await getUndefined(session);
  });
  afterAll(async() => {
    server?.close();
    await closeSession(session, process);
  });

  test('Expression_comma_sequence', async(): Promise<void> => {
    expect(await evaluator.eval(`123, "a"`)).toBe('a');
  });

  test('AssignmentExpression_assign', async(): Promise<void> => {
    expect(await evaluator.eval(`foo := "abc"`)).toBe('abc');
    expect(await evaluator.eval(`foo`)).toBe('abc');

    expect(await evaluator.eval(`global foo := "bbb"`)).toBe('bbb');
    expect(await evaluator.eval(`foo`)).toBe('bbb');
  });

  test('ReAssignmentExpression_addition', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 3`);
    expect(await evaluator.eval(`num_reassign += 1`)).toBe(4);
  });

  test('ReAssignmentExpression_subtraction', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 3`);
    expect(await evaluator.eval(`num_reassign -= 1`)).toBe(2);
  });

  test('ReAssignmentExpression_multiplication', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 3`);
    expect(await evaluator.eval(`num_reassign *= 3`)).toBe(9);
  });

  test('ReAssignmentExpression_division', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 3`);
    expect(await evaluator.eval(`num_reassign /= 3`)).toBe(1);

    await evaluator.eval(`num_reassign := 0`);
    expect(await evaluator.eval(`num_reassign /= 0`)).toBe('');
  });

  test('ReAssignmentExpression_floor_division', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 3`);
    expect(async() => evaluator.eval(`num_reassign //= 3`)).rejects.toThrow();
  });

  test('ReAssignmentExpression_concatenate', async(): Promise<void> => {
    await evaluator.eval(`str_reassign := "abc"`);
    expect(await evaluator.eval(`str_reassign .= "def"`)).toBe('abcdef');
  });

  test('ReAssignmentExpression_bitwise_or', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 5`);
    expect(await evaluator.eval('num_reassign |= 3')).toBe(7);
  });

  test('ReAssignmentExpression_bitwise_xor', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 5`);
    expect(await evaluator.eval('num_reassign ^= 3')).toBe(6);
  });

  test('ReAssignmentExpression_bitwise_and', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 5`);
    expect(await evaluator.eval('num_reassign &= 3')).toBe(1);
  });

  test('ReAssignmentExpression_bitshift_left', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 5`);
    expect(await evaluator.eval('num_reassign <<= 2')).toBe(20);
  });

  test('ReAssignmentExpression_bitshift_right', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 5`);
    expect(await evaluator.eval('num_reassign >>= 2')).toBe(1);
  });

  test('ReAssignmentExpression_bitshift_logical_right', async(): Promise<void> => {
    await evaluator.eval(`num_reassign := 5`);
    expect(await evaluator.eval('num_reassign >>>= 2')).toBe(1);
  });

  test('TernaryExpression_ternary', async(): Promise<void> => {
    expect(await evaluator.eval(`true ? 100 : 0`)).toBe(100);
    expect(await evaluator.eval(`false ? 100 : 0`)).toBe(0);
  });

  test('LogicalOrExpression_or', async(): Promise<void> => {
    expect(await evaluator.eval('true || true')).toBe(1);
    expect(await evaluator.eval('true || false')).toBe(1);
    expect(await evaluator.eval('instance || false')).toBe(1);
    expect(await evaluator.eval('false || false')).toBe(0);
  });

  test('LogicalAndExpression_and', async(): Promise<void> => {
    expect(await evaluator.eval('true && true')).toBe(1);
    expect(await evaluator.eval('true && false')).toBe(0);
    expect(await evaluator.eval('false && false')).toBe(0);
    expect(await evaluator.eval('instance && false')).toBe(0);
  });

  test('EqualityExpression_loose_equal', async(): Promise<void> => {
    expect(await evaluator.eval('10 = 10')).toBe(1);
    expect(await evaluator.eval('"abc" = "ABC"')).toBe(1);
    expect(await evaluator.eval('obj = obj')).toBe(1);
    expect(await evaluator.eval('"abc" = "ABCD"')).toBe(0);
    expect(await evaluator.eval('instance = T')).toBe(0);
  });

  test('EqualityExpression_equal', async(): Promise<void> => {
    expect(await evaluator.eval('10 == 10')).toBe(1);
    expect(await evaluator.eval('obj == obj')).toBe(1);
    expect(await evaluator.eval('"abc" == "ABC"')).toBe(0);
    expect(await evaluator.eval('instance == T')).toBe(0);
  });

  test('EqualityExpression_not_loose_equal', async(): Promise<void> => {
    expect(await evaluator.eval('"abc" != "ABCD"')).toBe(1);
    expect(await evaluator.eval('instance != T')).toBe(1);
    expect(await evaluator.eval('10 != 10')).toBe(0);
    expect(await evaluator.eval('"abc" != "ABC"')).toBe(0);
    expect(await evaluator.eval('obj != obj')).toBe(0);
  });

  test('EqualityExpression_not_equal', async(): Promise<void> => {
    expect(await evaluator.eval('"abc" !== "ABC"')).toBe(1);
    expect(await evaluator.eval('instance !== T')).toBe(1);
    expect(await evaluator.eval('10 !== 10')).toBe(0);
    expect(await evaluator.eval('obj !== obj')).toBe(0);
  });

  test('RelationalExpression_lessthan', async(): Promise<void> => {
    expect(await evaluator.eval('0 < 1')).toBe(1);
    expect(await evaluator.eval('0 < num_int')).toBe(1);
    expect(await evaluator.eval('0 < 0')).toBe(0);
    expect(await evaluator.eval('"abc" < "ABC"')).toBe(0);
  });

  test('RelationalExpression_lessthan_equal', async(): Promise<void> => {
    expect(await evaluator.eval('0 <= 1')).toBe(1);
    expect(await evaluator.eval('0 <= num_int')).toBe(1);
    expect(await evaluator.eval('0 <= 0')).toBe(1);
    expect(await evaluator.eval('"abc" <= "ABC"')).toBe(0);
  });

  test('RelationalExpression_greaterthan', async(): Promise<void> => {
    expect(await evaluator.eval('1 > 0')).toBe(1);
    expect(await evaluator.eval('num_int > 0')).toBe(1);
    expect(await evaluator.eval('0 > 0')).toBe(0);
    expect(await evaluator.eval('0 > num_int')).toBe(0);
    expect(await evaluator.eval('"abc" > "ABC"')).toBe(0);
  });

  test('RelationalExpression_greaterthan_equal', async(): Promise<void> => {
    expect(await evaluator.eval('1 >= 0')).toBe(1);
    expect(await evaluator.eval('num_int >= 0')).toBe(1);
    expect(await evaluator.eval('0 >= 0')).toBe(1);
    expect(await evaluator.eval('0 >= num_int')).toBe(0);
    expect(await evaluator.eval('"abc" >= "ABC"')).toBe(0);
  });

  test('RegExMatchExpression_regex_match', async(): Promise<void> => {
    expect(await evaluator.eval('str_alpha ~= "i)ABC"')).toBe(1);
    expect(await evaluator.eval('str_alpha ~= "B"')).toBe(2);
    expect(await evaluator.eval('str_alpha ~= "i)z"')).toBe(0);
  });

  test('ConcatenateExpression_space', async(): Promise<void> => {
    expect(await evaluator.eval('str_alpha str_alnum')).toBe('aBcaBc123');
  });

  test('ConcatenateExpression_dot', async(): Promise<void> => {
    expect(await evaluator.eval('str_alpha . str_alnum')).toBe('aBcaBc123');
    expect(await evaluator.eval('str_alpha  .  str_alnum')).toBe('aBcaBc123');
    expect(async() => evaluator.eval(`str_alpha .1`)).rejects.toThrow();
    expect(async() => evaluator.eval(`str_alpha. 1`)).rejects.toThrow();
  });

  test('BitwiseExpression_or', async(): Promise<void> => {
    expect(await evaluator.eval('5 | 3')).toBe(7);
  });

  test('BitwiseExpression_xor', async(): Promise<void> => {
    expect(await evaluator.eval('5 ^ 3')).toBe(6);
  });

  test('BitwiseExpression_and', async(): Promise<void> => {
    expect(await evaluator.eval('5 & 3')).toBe(1);
  });

  test('BitshiftExpression_left', async(): Promise<void> => {
    expect(await evaluator.eval('5 << 2')).toBe(20);
  });

  test('BitshiftExpression_right', async(): Promise<void> => {
    expect(await evaluator.eval('5 >> 2')).toBe(1);
  });

  test('BitshiftExpression_logical_right', async(): Promise<void> => {
    expect(await evaluator.eval('5 >>> 2')).toBe(1);
  });

  test('AdditiveExpression_addition', async(): Promise<void> => {
    expect(await evaluator.eval('1 + 1')).toBe(2);
    expect(await evaluator.eval('num_int + 2')).toBe(125);
    expect(await evaluator.eval('obj + 3')).toBe('');
  });

  test('AdditiveExpression_subtraction', async(): Promise<void> => {
    expect(await evaluator.eval('1 - 1')).toBe(0);
    expect(await evaluator.eval('num_int - 123')).toBe(0);
  });

  test('MultiplicativeExpression_multiplication', async(): Promise<void> => {
    expect(await evaluator.eval('3 ** 2')).toBe(9);
  });

  test('ExponentiationExpression_power', async(): Promise<void> => {
    expect(await evaluator.eval('3 * 3')).toBe(9);
    expect(await evaluator.eval('num_int * 0')).toBe(0);
  });

  test('MultiplicativeExpression_division', async(): Promise<void> => {
    expect(await evaluator.eval('3 / 3')).toBe(1);
    expect(await evaluator.eval('num_int / 0')).toBe('');
  });

  test('UnaryExpression_increment', async(): Promise<void> => {
    expect(await evaluator.eval(`++num_prefix_unary`)).toBe(1);
    expect(await evaluator.eval(`num_prefix_unary`)).toBe(1);
  });

  test('UnaryExpression_decrement', async(): Promise<void> => {
    expect(await evaluator.eval(`--num_prefix_unary`)).toBe(0);
    expect(await evaluator.eval(`num_prefix_unary`)).toBe(0);
  });

  test('UnaryExpression_positive', async(): Promise<void> => {
    expect(await evaluator.eval(`+num_int`)).toBe(await evaluator.eval(`num_int`));
    expect(await evaluator.eval(`+ num_int`)).toBe(await evaluator.eval(`num_int`));
  });

  test('UnaryExpression_negative', async(): Promise<void> => {
    expect(await evaluator.eval(`-num_int`)).toBe(await evaluator.eval(`-123`));
    expect(await evaluator.eval(`- num_int`)).toBe(await evaluator.eval(`-123`));
  });

  test('UnaryExpression_not', async(): Promise<void> => {
    expect(await evaluator.eval(`!true`)).toBe(0);
    expect(await evaluator.eval(`!num_int`)).toBe(0);
    expect(await evaluator.eval(`! num_int`)).toBe(0);
  });

  test('UnaryExpression_address', async(): Promise<void> => {
    expect(await evaluator.eval(`~123`)).toBe(-124);
    expect(await evaluator.eval(`~ 123`)).toBe(-124);
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  test('UnaryExpression_bitwise_not', async(): Promise<void> => {
    expect(async() => evaluator.eval(`&num_int`)).rejects.toThrow();
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  test('UnaryExpression_dereference', async(): Promise<void> => {
    expect(async() => evaluator.eval(`*num_int`)).rejects.toThrow();
  });

  test('PostfixUnaryExpression_increment', async(): Promise<void> => {
    expect(await evaluator.eval(`num_postfix_unary++`)).toBe(0);
    expect(await evaluator.eval(`num_postfix_unary`)).toBe(1);
  });

  test('PostfixUnaryExpression_decrement', async(): Promise<void> => {
    expect(await evaluator.eval(`num_postfix_unary--`)).toBe(1);
    expect(await evaluator.eval(`num_postfix_unary`)).toBe(0);
  });

  test('CallExpression_call', async(): Promise<void> => {
    expect(await evaluator.eval('IsString(str_alpha)')).toBe(true_ahk);
    expect(await evaluator.eval(`Contains(obj, "value")`)).toBe(true_ahk);
  });

  test('MemberExpression_propertyaccess', async(): Promise<void> => {
    expect(await evaluator.eval('obj.key')).toBe('value');
    expect(await evaluator.eval('nestedObj.a.b.key')).toBe('value');
  });

  test('MemberExpression_elementaccess', async(): Promise<void> => {
    expect(await evaluator.eval('obj["key"]')).toBe('value');
    expect(await evaluator.eval('obj[key]')).toBe('value');
    expect(await evaluator.eval('nestedObj["a"]["b"][key]')).toBe('value');
    expect(await evaluator.eval('nestedObj["a", "b", key]')).toBe('value');
  });

  test('MemberExpression_propertyaccess / MemberExpression_elementaccess', async(): Promise<void> => {
    expect(await evaluator.eval('nestedObj.a.b[key]')).toBe('value');
  });

  test('DereferenceExpressions', async(): Promise<void> => {
    expect(await evaluator.eval(`%str_alpha%`)).toBe(await evaluator.eval('abc'));
    expect(await evaluator.eval(`%a%b%c%`)).toBe(await evaluator.eval('abc'));
  });

  test('ParenthesizedExpression', async(): Promise<void> => {
    expect(await evaluator.eval(`(1 + 2) * 3`)).toBe(9);
    expect(await evaluator.eval(`true && false || true`)).toBe(1);
    expect(await evaluator.eval(`true || true && false`)).toBe(1);
    expect(await evaluator.eval(`(true || true) && false`)).toBe(0);
  });

  test('identifier', async(): Promise<void> => {
    expect(await evaluator.eval('num_int')).toBe(123);
    expect(await evaluator.eval('true')).toBe(true_ahk);
    expect(await evaluator.eval('TrUe')).toBe(true_ahk);
    expect(await evaluator.eval('false')).toBe(false_ahk);
    expect(await evaluator.eval('fAlsE')).toBe(false_ahk);
  });

  test('stringLiteral', async(): Promise<void> => {
    expect(await evaluator.eval('"abc"')).toBe('abc');
    expect(await evaluator.eval('""""')).toBe('"');
    expect(await evaluator.eval('"``"')).toBe('`');
    expect(await evaluator.eval('"`,"')).toBe(',');
    expect(await evaluator.eval('"`%"')).toBe('%');
    expect(await evaluator.eval('"`;"')).toBe(';');
    expect(await evaluator.eval('"`::"')).toBe('::');
    expect(await evaluator.eval('"`r"')).toBe('\r');
    expect(await evaluator.eval('"`n"')).toBe('\n');
    expect(await evaluator.eval('"`b"')).toBe('\b');
    expect(await evaluator.eval('"`t"')).toBe('\t');
    expect(await evaluator.eval('"`v"')).toBe('\v');
    expect(await evaluator.eval('"`f"')).toBe('\f');
    expect(await evaluator.eval('"`a"')).toBe('\x07');
  });

  test('numericLiteral', async(): Promise<void> => {
    expect(await evaluator.eval('123')).toBe(123);
    expect(await evaluator.eval('123.456')).toBe('123.456');
    expect(await evaluator.eval('0x123')).toBe(291);
    expect(await evaluator.eval('1.0e4')).toBe('1.0e4');
    expect(await evaluator.eval('(1.0e4 + 1) . ""')).toBe('10001');
  });

  test('eval libraries (GetVar)', async(): Promise<void> => {
    expect(await evaluator.eval('GetVar("str_alpha")')).toBe(await evaluator.eval('str_alpha'));
    expect(await evaluator.eval('GetVar("<exception>")')).toBe(undefined);
    expect(await evaluator.eval('GetVar("instance.<base>")')).toBeTruthy();
  });

  test('eval libraries (GetMetaVar)', async(): Promise<void> => {
    expect(await evaluator.eval('GetMetaVar("hitCount")')).toBe(1);
    expect(await evaluator.eval('GetMetaVar("callstack")[0].name')).toBe('A');
  });

  test('eval precedence', async(): Promise<void> => {
    expect(await evaluator.eval(`1 + (2 + 3) * 4 ** 5`)).toBe(5121);
    expect(await evaluator.eval(`1 < 0 + 2`)).toBe(1);
    expect(await evaluator.eval(`1 <= "abc" ~= "b"`)).toBe(1);
    expect(await evaluator.eval(`1 + 2 * 3 "a" "b" . "c"`)).toBe('7abc');
    expect(await evaluator.eval(`"abc" ~= "b" == 2 && +7 - -7 == 14`)).toBe(1);
    expect(await evaluator.eval(`!("abc" ~= "b" == 2 && +7 - -7 == 14)`)).toBe(0);
    expect(await evaluator.eval(`false ? 100 : 5 + 5 == 10`)).toBe(1);
    expect(await evaluator.eval(`(false ? 100 : 5 + 5) + 5`)).toBe(15);
  });

  // #region Partial compatibility functions
  test('eval libraries (ObjHasKey)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`ObjHasKey(obj, "key")`));
    assert.strictEqual(...await testApi(`ObjHasKey(obj, key)`));
    assert.strictEqual(...await testApi(`ObjHasKey(arr, 1)`));
    assert.strictEqual(...await testApi(`ObjHasKey(T, "staticField")`));
    assert.strictEqual(...await testApi(`ObjHasKey(T, "method")`));
    assert.strictEqual(...await testApi(`instance.instanceField && ObjHasKey(instance, "instanceField")`));
    assert.strictEqual(...await testApi(`instance.baseInstanceField && ObjHasKey(instance, "baseInstanceField")`));
    assert.strictEqual(...await testApi(`!(instance.method && ObjHasKey(instance, "method"))`));
    assert.strictEqual(...await testApi(`!ObjHasKey(obj, "unknown")`));

    expect(await evaluator.eval('HasKey(obj, key)')).toBeTruthy();
  });

  test('eval libraries (IsSet)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`IsSet(str_alpha)`));
    assert.strictEqual(...await testApi(`IsSet(obj)`));
    assert.strictEqual(...await testApi(`IsSet(T)`));

    assert.strictEqual(...await testApi(`!IsSet(undefined)`));
  });

  test('eval libraries (IsObject)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`IsObject(obj)`));
    assert.strictEqual(...await testApi(`IsObject(T)`));

    assert.strictEqual(...await testApi(`!IsObject(str_alpha)`));
    assert.strictEqual(...await testApi(`!IsObject(num_int)`));
    assert.strictEqual(...await testApi(`!IsObject(undefined)`));
  });

  test('eval libraries (ObjGetBase)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`ObjGetBase(obj)`));
    assert.strictEqual(...await testApi(`ObjGetBase(T)`));
    assert.strictEqual(...await testApi(`ObjGetBase(T2)`));

    expect(await evaluator.eval(`ObjGetBase(str_alpha)`)).toBe('');
    expect(await evaluator.eval(`ObjGetBase(num_int)`)).toBe('');
    expect(await evaluator.eval(`ObjGetBase(undefined)`)).toBe('');

    expect(await evaluator.eval(`GetBase(str_alpha)`)).toBe('');
  });

  test('eval libraries (ObjCount)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`ObjCount(obj)`));
    assert.strictEqual(...await testApi(`ObjCount(arr)`));
    assert.strictEqual(...await testApi(`ObjCount(arr_like)`));
    assert.strictEqual(...await testApi(`ObjCount(T)`));
    assert.strictEqual(...await testApi(`ObjCount(T2)`));

    assert.strictEqual(...await testApi(`ObjCount(str_alpha)`));
    assert.strictEqual(...await testApi(`ObjCount(num_int)`));
    assert.strictEqual(...await testApi(`ObjCount(undefined)`));
  });

  test('eval libraries (Math)', async(): Promise<void> => {
    for await (const funcName of [ 'Abs', 'Ceil', 'Exp', 'Floor', 'Log', 'Ln', 'Round', 'Sqrt', 'Sin', 'Cos', 'Tan', 'ASin', 'ACos', 'ATan' ]) {
      assert.strictEqual(...await testApi(`${funcName}(0)`));
      assert.strictEqual(...await testApi(`${funcName}(3)`));
      assert.strictEqual(...await testApi(`${funcName}(-3)`));
      assert.strictEqual(...await testApi(`${funcName}(1.23)`));
      assert.strictEqual(...await testApi(`${funcName}(-1.23)`));
      assert.strictEqual(...await testApi(`${funcName}(num_int_like)`));
      assert.strictEqual(...await testApi(`${funcName}(str_alpha)`));
      assert.strictEqual(...await testApi(`${funcName}(obj)`));
    }

    for await (const funcName of [ 'Max', 'Min' ]) {
      assert.strictEqual(...await testApi(`${funcName}(1, "2", 3)`));
      assert.strictEqual(...await testApi(`${funcName}("a", "b", "c")`));
      assert.strictEqual(...await testApi(`${funcName}("1", "b", "c")`));
    }

    assert.strictEqual(...await testApi(`Mod(7.5, "2")`));
    assert.strictEqual(...await testApi(`Mod(2, "b")`));
  });

  test('eval libraries (StrLen)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`StrLen(str_alpha)`));
    assert.strictEqual(...await testApi(`StrLen(num_int)`));
    assert.strictEqual(...await testApi(`StrLen(obj)`));

    expect(await evaluator.eval(`StrLen(num_hex)`)).not.toBe(5);
  });

  //   test('eval libraries (InStr)', async(): Promise<void> => {
  //     assert.strictEqual(...await testApi(`InStr("abc", "B")`));
  //     assert.strictEqual(...await testApi(`InStr("abc", "B", false)`));
  //     assert.strictEqual(...await testApi(`InStr("abc", "b", true)`));
  //     assert.strictEqual(...await testApi(`InStr("abc", "b", "true")`));
  //     assert.strictEqual(...await testApi(`InStr("abcabc", "b", true, 3)`));
  //     assert.strictEqual(...await testApi(`InStr("abcabc", "b", true, 1, 2)`));
  //     assert.strictEqual(...await testApi(`InStr("abcabc", "b", true, -2, 1)`));
  //   });
  // #endregion Partial compatibility functions

  // #region Utility functions
  test('eval libraries (InstanceOf)', async(): Promise<void> => {
    expect(await evaluator.eval('InstanceOf(instance, T)')).toBe(true_ahk);
    expect(await evaluator.eval('InstanceOf(instance, T2)')).toBe(true_ahk);
    expect(await evaluator.eval('InstanceOf(instance, obj)')).toBe(false_ahk);
    expect(await evaluator.eval('InstanceOf(num_int)')).toBe('');
  });
  //   test('eval libraries (IsString)', async(): Promise<void> => {
  //     expect(await evaluator.eval('IsString(str_alpha)')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsString(num_int)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsString(num_int_like)')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsString(arr)')).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (IsPrimitive)', async(): Promise<void> => {
  //     expect(await evaluator.eval('IsPrimitive(str_alpha)')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsPrimitive(num_int)')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsPrimitive(undefined)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsPrimitive(obj)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsPrimitive(arr)')).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (IsClass)', async(): Promise<void> => {
  //     expect(await evaluator.eval('IsClass(T)')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsClass(T, "T")')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsClass(T, T)')).toBe(true_ahk);
  //     expect(await evaluator.eval('IsClass(2, "T")')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsClass(instance)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsClass(str_alpha)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsClass(num_int)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsClass(undefined)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsClass(obj)')).toBe(false_ahk);
  //     expect(await evaluator.eval('IsClass(arr)')).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (IsFile)', async(): Promise<void> => {
  //     expect(await evaluator.eval(`IsFile("${__filename}")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`IsFile("${__dirname}")`)).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (IsDirectory)', async(): Promise<void> => {
  //     expect(await evaluator.eval(`IsDirectory("${__dirname}")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`IsDir("${__filename}")`)).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (IsPath)', async(): Promise<void> => {
  //     expect(await evaluator.eval(`IsPath("${__dirname}")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`IsPath("${__filename}")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`IsPath("not path")`)).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (IsGlob)', async(): Promise<void> => {
  //     expect(await evaluator.eval(`IsGlob("${__dirname}/*.*")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`IsGlob("not path")`)).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (RegExHasKey)', async(): Promise<void> => {
  //     expect(await evaluator.eval(`RegExHasKey(obj, "key")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`RegExHasKey(obj, "i)Key")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`RegExHasKey(obj, "k*")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`RegExHasKey(arr, "1")`)).toBe(true_ahk);
  //     expect(await evaluator.eval(`RegExHasKey(str_alpha, "a")`)).toBe(false_ahk);
  //     expect(await evaluator.eval(`RegExHasKey(num_int, "b")`)).toBe(false_ahk);
  //   });
  //
  //   test('eval libraries (Contains)', async(): Promise<void> => {
  //     for await (const name of [ 'Contains', 'Includes' ]) {
  //       expect(await evaluator.eval(`${name}(obj, "value")`)).toBe(true_ahk);
  //       expect(await evaluator.eval(`${name}(str_alpha, "a")`)).toBe(true_ahk);
  //       expect(await evaluator.eval(`${name}(obj, "Value", true)`)).toBe(true_ahk);
  //       expect(await evaluator.eval(`${name}(str_alpha, "b", true)`)).toBe(true_ahk);
  //       expect(await evaluator.eval(`${name}(obj, "Value")`)).toBe(false_ahk);
  //       expect(await evaluator.eval(`${name}(str_alpha, "b")`)).toBe(false_ahk);
  //       expect(await evaluator.eval(`${name}(str_alpha, "z")`)).toBe(false_ahk);
  //       expect(await evaluator.eval(`${name}(undefined, "$")`)).toBe(false_ahk);
  //     }
  //   });
  // #endregion Utility functions

  test('eval not support', async(): Promise<void> => {
    expect(async() => evaluator.eval(`100 // 2`)).rejects.toThrow();

    return Promise.resolve();
  });

  test.skip('Even if all tests succeed, test suite is treated as a failure. For some reason, adding skip solves this problem.', async(): Promise<void> => {
  });
});

describe('ExpressionEvaluator for AutoHotkey-v2', (): void => {
  let process: ChildProcess;
  let server: net.Server;
  let session: dbgp.Session;
  let testApi: ApiTester;
  let evaluator: ExpressionEvaluator;
  let true_ahk: EvaluatedValue;
  let false_ahk: EvaluatedValue;
  // let undefined_ahk: EvaluatedValue;

  beforeAll(async() => {
    const data = await launchDebug('v2/AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk2'), 49155, hostname);
    process = data.process;
    server = data.server;
    session = data.session;
    await session.sendFeatureSetCommand('max_children', 10000);

    const metaVariableMap = new MetaVariableValueMap();
    metaVariableMap.set('hitCount', 1);
    metaVariableMap.set('callstack', [ { name: 'A' }, { name: 'B' } ]);
    evaluator = new ExpressionEvaluator(session, { metaVariableMap });
    testApi = createTestApi(evaluator);
    true_ahk = await getTrue(session);
    false_ahk = await getFalse(session);
    // undefined_ahk = await getUndefined(session);
  });
  afterAll(async() => {
    server.close();
    await closeSession(session, process);
  });

  test('eval double string', async(): Promise<void> => {
    expect(await evaluator.eval('"abc"')).toBe('abc');
    expect(await evaluator.eval('"`""')).toBe('"');
    expect(await evaluator.eval('"`,"')).toBe(',');
    expect(await evaluator.eval('"`%"')).toBe('%');
    expect(await evaluator.eval('"`;"')).toBe(';');
    expect(await evaluator.eval('"`::"')).toBe('::');
    expect(await evaluator.eval('"`r"')).toBe('\r');
    expect(await evaluator.eval('"`n"')).toBe('\n');
    expect(await evaluator.eval('"`b"')).toBe('\b');
    expect(await evaluator.eval('"`t"')).toBe('\t');
    expect(await evaluator.eval('"`v"')).toBe('\v');
    expect(await evaluator.eval('"`f"')).toBe('\f');
    expect(await evaluator.eval('"`a"')).toBe('\x07');
  });

  test('eval single string', async(): Promise<void> => {
    expect(await evaluator.eval(`'abc'`)).toBe('abc');
    expect(await evaluator.eval(`'""'`)).toBe('""');
    expect(await evaluator.eval(`'\`,'`)).toBe(',');
    expect(await evaluator.eval(`'\`%'`)).toBe('%');
    expect(await evaluator.eval(`'\`;'`)).toBe(';');
    expect(await evaluator.eval(`'\`::'`)).toBe('::');
    expect(await evaluator.eval(`'\`r'`)).toBe('\r');
    expect(await evaluator.eval(`'\`n'`)).toBe('\n');
    expect(await evaluator.eval(`'\`b'`)).toBe('\b');
    expect(await evaluator.eval(`'\`t'`)).toBe('\t');
    expect(await evaluator.eval(`'\`v'`)).toBe('\v');
    expect(await evaluator.eval(`'\`f'`)).toBe('\f');
    expect(await evaluator.eval(`'\`a'`)).toBe('\x07');
  });

  test('numericLiteral', async(): Promise<void> => {
    expect(await evaluator.eval('123')).toBe(123);
    expect(await evaluator.eval('123.456')).toBe(123.456);
    expect(await evaluator.eval('0x123')).toBe(291);
    expect(await evaluator.eval('1.0e4')).toStrictEqual(10000);
    expect(await evaluator.eval('(1.0e4 + 1) . ""')).toBe('10001');
  });

  test('eval dereference', async(): Promise<void> => {
    expect(await evaluator.eval(`%"str"%`)).toBe('abc');
    expect(await evaluator.eval(`%'str'%`)).toBe('abc');
    expect(await evaluator.eval(`%str%`)).toBe('str');
    expect(async() => evaluator.eval('% "str" %')).rejects.toThrow();
  });

  test('eval dereference propertyaccess', async(): Promise<void> => {
    expect(await evaluator.eval(`obj.%key%`)).toBe(await evaluator.eval('obj.key'));
    expect(await evaluator.eval(`obj.%'k'%e%'y'%`)).toBe(await evaluator.eval('obj.key'));
  });

  test('eval logical (&&)', async(): Promise<void> => {
    expect(await evaluator.eval('true && true')).toBe(true_ahk);
    expect(await evaluator.eval('true && false')).toBe(false_ahk);
    expect(await evaluator.eval('false && false')).toBe(false_ahk);
    expect(await evaluator.eval('(instance && false).instanceField')).toBe('');
  });

  test('eval logical (||)', async(): Promise<void> => {
    expect(await evaluator.eval('true || true')).toBe(true_ahk);
    expect(await evaluator.eval('true || false')).toBe(true_ahk);
    expect(await evaluator.eval('false || false')).toBe(false_ahk);
    expect(await evaluator.eval('(instance || false).instanceField')).toBe('instance');
  });

  // #region Partial compatibility functions
  test('eval libraries (ObjHasOwnProp)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`ObjHasOwnProp(obj, "key")`));
    assert.strictEqual(...await testApi(`ObjHasOwnProp(obj, key)`));
    assert.strictEqual(...await testApi(`ObjHasOwnProp(T, "staticField")`));
    assert.strictEqual(...await testApi(`instance.instanceField && ObjHasOwnProp(instance, "instanceField")`));
    assert.strictEqual(...await testApi(`instance.baseInstanceField && ObjHasOwnProp(instance, "baseInstanceField")`));

    assert.strictEqual(...await testApi(`!ObjHasOwnProp(obj, "unknown")`));
    assert.strictEqual(...await testApi(`!ObjHasOwnProp(mapObj, "key")`));
    assert.strictEqual(...await testApi(`!ObjHasOwnProp(mapObj, 3)`));
    assert.strictEqual(...await testApi(`!ObjHasOwnProp(T, "method")`));
    assert.strictEqual(...await testApi(`!ObjHasOwnProp(arr, 1)`));
    assert.strictEqual(...await testApi(`!(instance.method && ObjHasOwnProp(instance, "method"))`));

    expect(await evaluator.eval('HasOwnProp(obj, "key")')).toBeTruthy();
    expect(await evaluator.eval('ObjHasKey(obj, "key")')).toBeTruthy();
    expect(await evaluator.eval('HasKey(obj, "key")')).toBeTruthy();
  });

  test('eval libraries (IsSet)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`IsSet(str_alpha)`));
    assert.strictEqual(...await testApi(`IsSet(obj)`));
    assert.strictEqual(...await testApi(`IsSet(T)`));

    assert.strictEqual(...await testApi(`!IsSet(undefined)`));
  });

  test('eval libraries (IsObject)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`IsObject(obj)`));
    assert.strictEqual(...await testApi(`IsObject(T)`));

    assert.strictEqual(...await testApi(`!IsObject(str_alpha)`));
    assert.strictEqual(...await testApi(`!IsObject(num_int)`));

    expect(await evaluator.eval(`IsObject(undefined)`)).toBe('');
  });

  test('eval libraries (ObjGetBase)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`ObjGetBase(obj)`));
    assert.strictEqual(...await testApi(`ObjGetBase(T)`));
    assert.strictEqual(...await testApi(`ObjGetBase(T2)`));

    expect(await evaluator.eval(`ObjGetBase(str_alpha)`)).toBe('');
    expect(await evaluator.eval(`ObjGetBase(num_int)`)).toBe('');
    expect(await evaluator.eval(`ObjGetBase(undefined)`)).toBe('');

    expect(await evaluator.eval(`GetBase(str_alpha)`)).toBe('');
  });

  test('eval libraries (ObjOwnPropCount)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`ObjOwnPropCount(obj)`));
    assert.strictEqual(...await testApi(`ObjOwnPropCount(mapObj)`));
    assert.strictEqual(...await testApi(`ObjOwnPropCount(arr)`));
    assert.strictEqual(...await testApi(`ObjOwnPropCount(T)`));
    assert.strictEqual(...await testApi(`ObjOwnPropCount(T2)`));

    expect(await evaluator.eval(`ObjOwnPropCount(str_alpha)`)).toBe('');
    expect(await evaluator.eval(`ObjOwnPropCount(num_int)`)).toBe('');
    expect(await evaluator.eval(`ObjOwnPropCount(undefined)`)).toBe('');
  });

  test('eval libraries (Math)', async(): Promise<void> => {
    for await (const funcName of [ 'Abs', 'Ceil', 'Exp', 'Floor', 'Log', 'Ln', 'Round', 'Sqrt', 'Sin', 'Cos', 'Tan', 'ASin', 'ACos', 'ATan' ]) {
      assert.strictEqual(...await testApi(`${funcName}(0)`));
      assert.strictEqual(...await testApi(`${funcName}(3)`));
      assert.strictEqual(...await testApi(`${funcName}(-3)`));
      assert.strictEqual(...await testApi(`${funcName}(1.23)`));
      assert.strictEqual(...await testApi(`${funcName}(-1.23)`));
      assert.strictEqual(...await testApi(`${funcName}(num_int_like)`));
      assert.strictEqual(...await testApi(`${funcName}(str_alpha)`));
      assert.strictEqual(...await testApi(`${funcName}(obj)`));
    }

    for await (const funcName of [ 'Max', 'Min' ]) {
      assert.strictEqual(...await testApi(`${funcName}(1, "2", 3)`));
      assert.strictEqual(...await testApi(`${funcName}("a", "b", "c")`));
      assert.strictEqual(...await testApi(`${funcName}("1", "b", "c")`));
    }

    assert.strictEqual(...await testApi(`Mod(7.5, "2")`));
    assert.strictEqual(...await testApi(`Mod(2, "b")`));
  });

  test('eval libraries (StrLen)', async(): Promise<void> => {
    assert.strictEqual(...await testApi(`StrLen(str_alpha)`));
    assert.strictEqual(...await testApi(`StrLen(num_int)`));
    assert.strictEqual(...await testApi(`StrLen(num_hex)`));

    expect(await evaluator.eval(`StrLen(obj)`)).toBe('');
  });

  // test('eval libraries (InStr)', async(): Promise<void> => {
  //   assert.strictEqual(...await testApi(`InStr("abc", "B")`));
  //   assert.strictEqual(...await testApi(`InStr("abc", "B", false)`));
  //   assert.strictEqual(...await testApi(`InStr("abc", "b", true)`));
  //   assert.strictEqual(...await testApi(`InStr("abc", "b", "true")`));
  //   assert.strictEqual(...await testApi(`InStr("abcabc", "b", true, 3)`));
  //   assert.strictEqual(...await testApi(`InStr("abcabc", "b", true, 1, 2)`));
  //   assert.strictEqual(...await testApi(`InStr("abcabc", "b", true, -2, 1)`));
  // });
  // #endregion Partial compatibility functions

  // #region Utility functions
  // #endregion Utility functions

  test('eval not support', async(): Promise<void> => {
    expect(async() => evaluator.eval(`100 // 2`)).rejects.toThrow();

    return Promise.resolve();
  });

  test.skip('Even if all tests succeed, test suite is treated as a failure. For some reason, adding skip solves this problem.', async(): Promise<void> => {
  });
});

describe('Tests of functions compatible only with v2', (): void => {
  let process_v1: ChildProcess;
  let server_v1: net.Server | undefined;
  let session_v1: dbgp.Session;
  let evaluator_v1: ExpressionEvaluator;

  let testApi_v2: ApiTester;
  let process_v2: ChildProcess;
  let server_v2: net.Server | undefined;
  let session_v2: dbgp.Session;
  let evaluator_v2: ExpressionEvaluator;

  beforeAll(async() => {
    const data_v1 = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'sample2.ahk'), 50000, hostname);
    process_v1 = data_v1.process;
    server_v1 = data_v1.server;
    session_v1 = data_v1.session;
    evaluator_v1 = new ExpressionEvaluator(session_v1);

    const data_v2 = await launchDebug('v2/AutoHotkey.exe', path.resolve(sampleDir, 'sample2.ahk2'), 50001, hostname);
    process_v2 = data_v2.process;
    server_v2 = data_v2.server;
    session_v2 = data_v2.session;
    await session_v2.sendFeatureSetCommand('max_children', 10000);
    evaluator_v2 = new ExpressionEvaluator(session_v2);
    testApi_v2 = createTestApi(evaluator_v2);
  });
  afterAll(async() => {
    server_v1?.close();
    server_v2?.close();
    await closeSession(session_v1, process_v1);
    await closeSession(session_v2, process_v2);
  });

  test('eval libraries - Predicate functions', async(): Promise<void> => {
    const dataList = [
      `"abc"`,
      `"ABC"`,
      `"abcABC"`,
      `"abcABC123"`,
      `" "`,
      `"a b"`,
      `123`,
      `"123"`,
      `123.456`,
      `"123.456"`,
      `-123`,
      `"-123"`,
      `-123.456`,
      `"-123.456"`,
      `0x123`,
      `"0x123"`,
      `-0x123`,
      `"-0x123"`,
    ];

    for await (const funcName of [ 'IsInteger', 'IsFloat', 'IsNumber', 'IsDigit', 'IsXDigit', 'IsAlpha', 'IsAlnum', 'IsSpace', 'IsUpper', 'IsLower' ]) {
      for await (const data of dataList) {
        const expression = `${funcName}(${data})`;
        const [ actual_v2, expected, message ] = await testApi_v2(expression);
        assert.strictEqual(actual_v2, expected, message);

        // v1 treats floating points as strings, so the same function gives different results
        const actual_v1 = await evaluator_v1.eval(expression);
        if (isFloat(Number(data))) {
          const actual_v2 = await evaluator_v2.eval(`${funcName}("${data}")`);
          assert.strictEqual(String(actual_v2), actual_v1, expression);
          continue;
        }
        assert.strictEqual(String(actual_v2), actual_v1, expression);
      }
    }
  });

  test.skip('Even if all tests succeed, test suite is treated as a failure. For some reason, adding skip solves this problem.', async(): Promise<void> => {
  });
});
