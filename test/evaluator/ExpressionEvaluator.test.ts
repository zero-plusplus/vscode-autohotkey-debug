import * as fs from 'fs';
import * as net from 'net';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as dbgp from '../../src/dbgpSession';
import { EvaluatedValue, ExpressionEvaluator } from '../../src/util/evaluator/ExpressionEvaluator';
import { timeoutPromise, toFileUri } from '../../src/util/util';
import { getFalse, getTrue } from '../../src/util/evaluator/library';
import { MetaVariableValueMap } from '../../src/util/VariableManager';

export const debugAutoHotkey = (file: string, runtime?: string, port = 9000, hostname = 'localhost'): ChildProcess => {
  let _runtime = runtime ?? `${String(process.env.PROGRAMFILES)}/AutoHotkey/AutoHotkey.exe`;
  if (!path.isAbsolute(_runtime)) {
    _runtime = path.join(`${String(process.env.PROGRAMFILES)}/AutoHotkey`, _runtime);
  }
  return spawn(_runtime, [ `/Debug=${hostname}:${port}`, '/force', '/restart', file ]);
};
export const launchDebug = async(runtime: string, program: string, port: number, hostname: string): Promise<{ session: dbgp.Session; process: ChildProcess; server: net.Server }> => {
  return new Promise((resolve) => {
    const process = debugAutoHotkey(program, runtime, port, hostname);
    const server = net.createServer()
      .listen(port, hostname)
      .on('connection', (socket) => {
        const session = new dbgp.Session(socket)
          .on('init', (initPacket: dbgp.InitPacket) => {
            // eslint-disable-next-line no-sync
            const source = fs.readFileSync(program, 'utf-8');
            const lines = source.split('\r\n').length;
            session.sendBreakpointSetCommand(toFileUri(program), lines);
            session.sendRunCommand();
            resolve({ session, process, server });
          });
      });
  });
};
const closeSession = async(session: dbgp.Session, process: ChildProcess): Promise<void> => {
  if (session.socketWritable) {
    await timeoutPromise(session.sendStopCommand(), 500).catch(() => {
      process.kill();
    });
  }
  await session.close();
};

const sampleDir = path.resolve(__dirname, 'ahk');
const port = 9003;
const hostname = '127.0.0.1';
describe('ExpressionEvaluator for AutoHotkey-v1', (): void => {
  let process: ChildProcess;
  let server: net.Server;
  let session: dbgp.Session;
  let evaluator: ExpressionEvaluator;
  let true_ahk: EvaluatedValue;
  let false_ahk: EvaluatedValue;
  // let undefined_ahk: EvaluatedValue;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk'), port, hostname);
    process = data.process;
    server = data.server;
    session = data.session;

    const metaVariables = new MetaVariableValueMap();
    metaVariables.set('hitCount', 1);
    metaVariables.set('callstack', [ { name: 'A' }, { name: 'B' } ]);
    evaluator = new ExpressionEvaluator(session, metaVariables);
    true_ahk = await getTrue(session);
    false_ahk = await getFalse(session);
    // undefined_ahk = await getUndefined(session);
  });
  afterAll(async() => {
    server.close();
    await closeSession(session, process);
  });

  test('Expression_comma_sequence', async(): Promise<void> => {
    expect(await evaluator.eval(`1, 2, 3`)).toBe(3);
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
    expect(await evaluator.eval('true || true')).toBe(true_ahk);
    expect(await evaluator.eval('true || false')).toBe(true_ahk);
    expect(await evaluator.eval('instance || false')).toBe(true_ahk);
    expect(await evaluator.eval('false || false')).toBe(false_ahk);
  });

  test('LogicalAndExpression_and', async(): Promise<void> => {
    expect(await evaluator.eval('true && true')).toBe(true_ahk);
    expect(await evaluator.eval('true && false')).toBe(false_ahk);
    expect(await evaluator.eval('false && false')).toBe(false_ahk);
    expect(await evaluator.eval('instance && false')).toBe(false_ahk);
  });

  test('EqualityExpression_loose_equal', async(): Promise<void> => {
    expect(await evaluator.eval('10 = 10')).toBe(true_ahk);
    expect(await evaluator.eval('"abc" = "ABC"')).toBe(true_ahk);
    expect(await evaluator.eval('obj = obj')).toBe(true_ahk);
    expect(await evaluator.eval('"abc" = "ABCD"')).toBe(false_ahk);
    expect(await evaluator.eval('instance = T')).toBe(false_ahk);
  });

  test('EqualityExpression_equal', async(): Promise<void> => {
    expect(await evaluator.eval('10 == 10')).toBe(true_ahk);
    expect(await evaluator.eval('obj == obj')).toBe(true_ahk);
    expect(await evaluator.eval('"abc" == "ABC"')).toBe(false_ahk);
    expect(await evaluator.eval('instance == T')).toBe(false_ahk);
  });

  test('EqualityExpression_not_loose_equal', async(): Promise<void> => {
    expect(await evaluator.eval('"abc" != "ABCD"')).toBe(true_ahk);
    expect(await evaluator.eval('instance != T')).toBe(true_ahk);
    expect(await evaluator.eval('10 != 10')).toBe(false_ahk);
    expect(await evaluator.eval('"abc" != "ABC"')).toBe(false_ahk);
    expect(await evaluator.eval('obj != obj')).toBe(false_ahk);
  });

  test('EqualityExpression_not_equal', async(): Promise<void> => {
    expect(await evaluator.eval('"abc" !== "ABC"')).toBe(true_ahk);
    expect(await evaluator.eval('instance !== T')).toBe(true_ahk);
    expect(await evaluator.eval('10 !== 10')).toBe(false_ahk);
    expect(await evaluator.eval('obj !== obj')).toBe(false_ahk);
  });

  test('RelationalExpression_lessthan', async(): Promise<void> => {
    expect(await evaluator.eval('0 < 1')).toBe(true_ahk);
    expect(await evaluator.eval('0 < num_int')).toBe(true_ahk);
    expect(await evaluator.eval('0 < 0')).toBe(false_ahk);
    expect(await evaluator.eval('"abc" < "ABC"')).toBe(false_ahk);
  });

  test('RelationalExpression_lessthan_equal', async(): Promise<void> => {
    expect(await evaluator.eval('0 <= 1')).toBe(true_ahk);
    expect(await evaluator.eval('0 <= num_int')).toBe(true_ahk);
    expect(await evaluator.eval('0 <= 0')).toBe(true_ahk);
    expect(await evaluator.eval('"abc" <= "ABC"')).toBe(false_ahk);
  });

  test('RelationalExpression_greaterthan', async(): Promise<void> => {
    expect(await evaluator.eval('1 > 0')).toBe(true_ahk);
    expect(await evaluator.eval('num_int > 0')).toBe(true_ahk);
    expect(await evaluator.eval('0 > 0')).toBe(false_ahk);
    expect(await evaluator.eval('0 > num_int')).toBe(false_ahk);
    expect(await evaluator.eval('"abc" > "ABC"')).toBe(false_ahk);
  });

  test('RelationalExpression_greaterthan_equal', async(): Promise<void> => {
    expect(await evaluator.eval('1 >= 0')).toBe(true_ahk);
    expect(await evaluator.eval('num_int >= 0')).toBe(true_ahk);
    expect(await evaluator.eval('0 >= 0')).toBe(true_ahk);
    expect(await evaluator.eval('0 >= num_int')).toBe(false_ahk);
    expect(await evaluator.eval('"abc" >= "ABC"')).toBe(false_ahk);
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
    expect(await evaluator.eval(`!true`)).toBe(false_ahk);
    expect(await evaluator.eval(`!num_int`)).toBe(false_ahk);
    expect(await evaluator.eval(`! num_int`)).toBe(false_ahk);
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
    expect(await evaluator.eval(`true && false || true`)).toBe(true_ahk);
    expect(await evaluator.eval(`true || true && false`)).toBe(true_ahk);
    expect(await evaluator.eval(`(true || true) && false`)).toBe(false_ahk);
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
  });

  test('eval libraries (GetVar)', async(): Promise<void> => {
    expect(await evaluator.eval('GetVar("str_alpha")')).toBe(await evaluator.eval('str_alpha'));
    expect(await evaluator.eval('GetVar("<exception>")')).toBe(undefined);
    expect(await evaluator.eval('GetVar("instance.<base>")')).toBeTruthy();
  });

  test('eval libraries (GetMeta)', async(): Promise<void> => {
    expect(await evaluator.eval('GetMeta("hitCount")')).toBe(1);
    expect(await evaluator.eval('GetMeta("callstack")[0].name')).toBe('A');
  });

  test('eval libraries (IsSet)', async(): Promise<void> => {
    for await (const name of [ 'IsSet', 'IsUndefined' ]) {
      expect(await evaluator.eval(`${name}(undefined)`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(null)`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(GetMeta(""))`)).toBe(true_ahk);
    }
  });

  test('eval libraries (IsString)', async(): Promise<void> => {
    expect(await evaluator.eval('IsString(str_alpha)')).toBe(true_ahk);
    expect(await evaluator.eval('IsString(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsString(num_int_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsString(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsNumber)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumber(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumber(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsNumber(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsNumberLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumberLike(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsNumberLike(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumberLike(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsInteger)', async(): Promise<void> => {
    expect(await evaluator.eval('IsInteger(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsInteger(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsInteger(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsInteger(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsIntegerLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsIntegerLike(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsIntegerLike(num_int_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsIntegerLike(num_float)')).toBe(false_ahk);
    expect(await evaluator.eval('IsIntegerLike(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsFloat)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloat(num_float)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(num_float_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsFloatLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloatLike(num_float)')).toBe(true_ahk);
    expect(await evaluator.eval('IsFloatLike(num_float_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsFloatLike(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloatLike(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloatLike(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsHexLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsHexLike(num_hex_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsHexLike(num_hex)')).toBe(false_ahk);
    expect(await evaluator.eval('IsHexLike(num_float)')).toBe(false_ahk);
    expect(await evaluator.eval('IsHexLike(num_float_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsHexLike(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsHexLike(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsHexLike(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsPrimitive)', async(): Promise<void> => {
    expect(await evaluator.eval('IsPrimitive(str_alpha)')).toBe(true_ahk);
    expect(await evaluator.eval('IsPrimitive(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsPrimitive(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsPrimitive(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsPrimitive(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsObject)', async(): Promise<void> => {
    expect(await evaluator.eval('IsObject(obj)')).toBe(true_ahk);
    expect(await evaluator.eval('IsObject(arr)')).toBe(true_ahk);
    expect(await evaluator.eval('IsObject(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsObject(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsObject(undefined)')).toBe(false_ahk);
  });

  test('eval libraries (IsAlpha)', async(): Promise<void> => {
    expect(await evaluator.eval('IsAlpha(str_alpha)')).toBe(true_ahk);
    expect(await evaluator.eval('IsAlpha(str_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlpha(str_not_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlpha(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlpha(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlpha(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlpha(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsAlnum)', async(): Promise<void> => {
    expect(await evaluator.eval('IsAlnum(str_alpha)')).toBe(true_ahk);
    expect(await evaluator.eval('IsAlnum(str_alnum)')).toBe(true_ahk);
    expect(await evaluator.eval('IsAlnum(str_not_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlnum(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlnum(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlnum(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsAlnum(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsUpper)', async(): Promise<void> => {
    expect(await evaluator.eval('IsUpper(str_upper)')).toBe(true_ahk);
    expect(await evaluator.eval('IsUpper(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsUpper(str_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsUpper(str_not_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsUpper(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsUpper(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsUpper(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsUpper(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsLower)', async(): Promise<void> => {
    expect(await evaluator.eval('IsLower(str_lower)')).toBe(true_ahk);
    expect(await evaluator.eval('IsLower(str_upper)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(str_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(str_not_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsLower(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsTime)', async(): Promise<void> => {
    expect(await evaluator.eval('IsTime(str_time)')).toBe(true_ahk);
    expect(await evaluator.eval('IsTime(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsTime(str_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsTime(str_not_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsTime(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsTime(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsTime(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsTime(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsSpace)', async(): Promise<void> => {
    expect(await evaluator.eval('IsSpace(str_space)')).toBe(true_ahk);
    expect(await evaluator.eval('IsSpace(str_time)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(str_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(str_not_alnum)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsSpace(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsClass)', async(): Promise<void> => {
    expect(await evaluator.eval('IsClass(T)')).toBe(true_ahk);
    expect(await evaluator.eval('IsClass(T, "T")')).toBe(true_ahk);
    expect(await evaluator.eval('IsClass(T, T)')).toBe(true_ahk);
    expect(await evaluator.eval('IsClass(2, "T")')).toBe(false_ahk);
    expect(await evaluator.eval('IsClass(instance)')).toBe(false_ahk);
    expect(await evaluator.eval('IsClass(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsClass(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsClass(undefined)')).toBe(false_ahk);
    expect(await evaluator.eval('IsClass(obj)')).toBe(false_ahk);
    expect(await evaluator.eval('IsClass(arr)')).toBe(false_ahk);
  });

  test('eval libraries (IsFile)', async(): Promise<void> => {
    expect(await evaluator.eval(`IsFile("${__filename}")`)).toBe(true_ahk);
    expect(await evaluator.eval(`IsFile("${__dirname}")`)).toBe(false_ahk);
  });

  test('eval libraries (IsDirectory)', async(): Promise<void> => {
    expect(await evaluator.eval(`IsDirectory("${__dirname}")`)).toBe(true_ahk);
    expect(await evaluator.eval(`IsDir("${__filename}")`)).toBe(false_ahk);
  });

  test('eval libraries (IsPath)', async(): Promise<void> => {
    expect(await evaluator.eval(`IsPath("${__dirname}")`)).toBe(true_ahk);
    expect(await evaluator.eval(`IsPath("${__filename}")`)).toBe(true_ahk);
    expect(await evaluator.eval(`IsPath("not path")`)).toBe(false_ahk);
  });

  test('eval libraries (IsGlob)', async(): Promise<void> => {
    expect(await evaluator.eval(`IsGlob("${__dirname}/*.*")`)).toBe(true_ahk);
    expect(await evaluator.eval(`IsGlob("not path")`)).toBe(false_ahk);
  });

  test('eval libraries (HasKey)', async(): Promise<void> => {
    for await (const name of [ 'HasKey', 'ObjHasKey' ]) {
      expect(await evaluator.eval(`${name}(obj, "key")`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(obj, key)`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(arr, 1)`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(T, "staticField")`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(T, "method")`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(instance, "instanceField")`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(instance, "method")`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(str_alpha)`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(num_int)`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(undefined)`)).toBe(false_ahk);
    }
  });

  test('eval libraries (RegExHasKey)', async(): Promise<void> => {
    expect(await evaluator.eval(`RegExHasKey(obj, "key")`)).toBe(true_ahk);
    expect(await evaluator.eval(`RegExHasKey(obj, "i)Key")`)).toBe(true_ahk);
    expect(await evaluator.eval(`RegExHasKey(obj, "k*")`)).toBe(true_ahk);
    expect(await evaluator.eval(`RegExHasKey(arr, "1")`)).toBe(true_ahk);
    expect(await evaluator.eval(`RegExHasKey(str_alpha, "a")`)).toBe(false_ahk);
    expect(await evaluator.eval(`RegExHasKey(num_int, "b")`)).toBe(false_ahk);
  });

  test('eval libraries (Contains)', async(): Promise<void> => {
    for await (const name of [ 'Contains', 'Includes' ]) {
      expect(await evaluator.eval(`${name}(obj, "value")`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(str_alpha, "a")`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(obj, "Value", true)`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(str_alpha, "b", true)`)).toBe(true_ahk);
      expect(await evaluator.eval(`${name}(obj, "Value")`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(str_alpha, "b")`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(str_alpha, "z")`)).toBe(false_ahk);
      expect(await evaluator.eval(`${name}(undefined, "$")`)).toBe(false_ahk);
    }
  });

  test('eval precedence', async(): Promise<void> => {
    expect(await evaluator.eval(`1 + (2 + 3) * 4 ** 5`)).toBe(5121);
    expect(await evaluator.eval(`1 < 0 + 2`)).toBe(true_ahk);
    expect(await evaluator.eval(`1 <= "abc" ~= "b"`)).toBe(true_ahk);
    expect(await evaluator.eval(`1 + 2 * 3 "a" "b" . "c"`)).toBe('7abc');
    expect(await evaluator.eval(`"abc" ~= "b" == 2 && +7 - -7 == 14`)).toBe(true_ahk);
    expect(await evaluator.eval(`!("abc" ~= "b" == 2 && +7 - -7 == 14)`)).toBe(false_ahk);
    expect(await evaluator.eval(`false ? 100 : 5 + 5 == 10`)).toBe(true_ahk);
    expect(await evaluator.eval(`(false ? 100 : 5 + 5) + 5`)).toBe(15);
  });

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
  let evaluator: ExpressionEvaluator;
  let true_ahk: EvaluatedValue;
  let false_ahk: EvaluatedValue;
  // let undefined_ahk: EvaluatedValue;

  beforeAll(async() => {
    const data = await launchDebug('v2/AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk2'), port + 1, hostname);
    process = data.process;
    server = data.server;
    session = data.session;

    const metaVariables = new MetaVariableValueMap();
    metaVariables.set('hitCount', 1);
    metaVariables.set('callstack', [ { name: 'A' }, { name: 'B' } ]);
    evaluator = new ExpressionEvaluator(session, metaVariables);
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

  test('eval dereference', async(): Promise<void> => {
    expect(await evaluator.eval(`%"str"%`)).toBe('abc');
    expect(await evaluator.eval(`%'str'%`)).toBe('abc');
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

  test('eval libraries (IsNumber)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumber(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumber(num_float)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumber(num_hex)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumber(num_scientific_notation)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumber(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsNumber(arr)')).toBe(false_ahk);
  });
  test('eval libraries (IsNumberLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumberLike(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumberLike(num_int_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsNumberLike(arr)')).toBe(false_ahk);
  });
  test('eval libraries (IsInteger)', async(): Promise<void> => {
    expect(await evaluator.eval('IsInteger(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsInteger(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsInteger(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsInteger(arr)')).toBe(false_ahk);
  });
  test('eval libraries (IsIntegerLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsIntegerLike(num_int)')).toBe(true_ahk);
    expect(await evaluator.eval('IsIntegerLike(num_int_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsIntegerLike(num_float)')).toBe(false_ahk);
    expect(await evaluator.eval('IsIntegerLike(arr)')).toBe(false_ahk);
  });
  test('eval libraries (IsFloat)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloat(num_float)')).toBe(true_ahk);
    expect(await evaluator.eval('IsFloat(num_float_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(str_alpha)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloat(arr)')).toBe(false_ahk);
  });
  test('eval libraries (IsFloatLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloatLike(num_float)')).toBe(true_ahk);
    expect(await evaluator.eval('IsFloatLike(num_float_like)')).toBe(true_ahk);
    expect(await evaluator.eval('IsFloatLike(num_int)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloatLike(num_int_like)')).toBe(false_ahk);
    expect(await evaluator.eval('IsFloatLike(arr)')).toBe(false_ahk);
  });
  test.skip('Even if all tests succeed, test suite is treated as a failure. For some reason, adding skip solves this problem.', async(): Promise<void> => {
  });
});
