/* eslint-disable @typescript-eslint/require-await */
import { promises as fs } from 'fs';
import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { EvaluatedValue, fetchGlobalProperty, fetchProperty, fetchPropertyChild, fetchPropertyOwnChildren, includesPropertyChild, isInfinite } from './ExpressionEvaluator';
import * as util from '../util';
import { MetaVariable } from '../VariableManager';

export const getTrue = async(session: dbgp.Session, stackFrame?: dbgp.StackFrame): Promise<EvaluatedValue> => {
  return fetchGlobalProperty(session, 'true', stackFrame);
};
export const getFalse = async(session: dbgp.Session, stackFrame?: dbgp.StackFrame): Promise<EvaluatedValue> => {
  return fetchGlobalProperty(session, 'false', stackFrame);
};
export const toBoolean = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, value: EvaluatedValue): Promise<EvaluatedValue> => {
  const _value = String(value);
  if (_value === '0') {
    return getFalse(session, stackFrame);
  }
  else if (_value === '') {
    return getFalse(session, stackFrame);
  }
  return getTrue(session, stackFrame);
};
export const toNumber = (value: any): number | '' => {
  if ((/^\s+$/u).test(String(value))) {
    return '';
  }
  if ((/^-0x/ui).test(String(value))) {
    const number = Number(String(value).slice(1));
    if (!isFinite(number)) {
      return '';
    }
    return -number;
  }

  const number = Number(value);
  if (!isFinite(number)) {
    return '';
  }
  return number;
};
export const getUndefined = async(session: dbgp.Session, stackFrame?: dbgp.StackFrame): Promise<EvaluatedValue> => {
  // To get undefined, it is necessary to specify a name that will never be covered
  const name = 'D466D841_6E55_421C_9389_EFF0444115D9_B3F83A54_7903_4FDD_B5BF_BC92ADB651A6';
  return fetchGlobalProperty(session, name, stackFrame);
};
export const ahkRegexMatch = (value: string, regexString: string): number => {
  const _value = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  const flagsMatch = regexString.match(/(?<flags>^([imsxADJUXPOSC]|`n|`r|`a)+)\)/u);
  if (!flagsMatch?.groups?.flags) {
    return (RegExp(regexString, 'u').exec(_value)?.index ?? -1) + 1;
  }
  const regexString_body = regexString.replace(`${flagsMatch.groups.flags})`, '');
  return (RegExp(regexString_body, `${flagsMatch.groups.flags}`).exec(_value)?.index ?? -1) + 1;
};

export type FunctionMap = CaseInsensitiveMap<string, LibraryFunc>;
export type FormatSpecifyMap = Map<string, LibraryFunc>;
export type LibraryFunc = (session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, ...params: EvaluatedValue[]) => Promise<EvaluatedValue>;

export const formatSpecifiers_v1: FormatSpecifyMap = new Map();
export const formatSpecifiers_v2: FormatSpecifyMap = new Map();
export const copatibleFunctions_for_v1: FunctionMap = new CaseInsensitiveMap();
export const copatibleFunctions_for_v2: FunctionMap = new CaseInsensitiveMap();
export const imcopatibleFunctions_for_v1: FunctionMap = new CaseInsensitiveMap();
export const imcopatibleFunctions_for_v2: FunctionMap = new CaseInsensitiveMap();

// #region Compatible functions with AutoHotkey
// https://www.autohotkey.com/docs/lib/Object.htm#HasKey
const objHasKey: LibraryFunc = async(session, stackFrame, value, key) => {
  if (!(value instanceof dbgp.ObjectProperty)) {
    return 0;
  }

  if (2 <= session.ahkVersion.mejor) {
    const children = await fetchPropertyOwnChildren(session, stackFrame, value);
    const child = children?.find((child) => {
      if (child.name.startsWith('[')) {
        return false;
      }
      return includesPropertyChild(session.ahkVersion, child, key);
    });
    return child ? 1 : 0;
  }

  const child = await fetchPropertyChild(session, stackFrame, value, key);
  return child ? 1 : 0;
};
copatibleFunctions_for_v1.set('ObjHasKey', objHasKey);
copatibleFunctions_for_v1.set('HasKey', objHasKey);
copatibleFunctions_for_v2.set('ObjHasOwnProp', objHasKey);
copatibleFunctions_for_v2.set('HasOwnProp', objHasKey);
copatibleFunctions_for_v2.set('ObjHasKey', objHasKey);
copatibleFunctions_for_v2.set('HasKey', objHasKey);

const isSet: LibraryFunc = async(session, stackFrame, value) => {
  if (session.ahkVersion.mejor <= 1.1 && session.ahkVersion.lessThan('1.1.35')) {
    return '';
  }
  return Promise.resolve(typeof value === 'undefined' ? 0 : 1);
};
copatibleFunctions_for_v1.set('IsSet', isSet);
copatibleFunctions_for_v2.set('IsSet', isSet);

const isObject: LibraryFunc = async(session, stackFrame, value) => {
  if (2 <= session.ahkVersion.mejor && value === undefined) {
    return Promise.resolve('');
  }
  return Promise.resolve(value instanceof dbgp.ObjectProperty ? 1 : 0);
};
copatibleFunctions_for_v1.set('IsObject', isObject);
copatibleFunctions_for_v2.set('IsObject', isObject);

const objGetBase: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty) {
    const base = await fetchProperty(session, `${value.fullName}.<base>`, stackFrame);
    if (base) {
      return base;
    }
  }
  return '';
};
copatibleFunctions_for_v1.set('ObjGetBase', objGetBase);
copatibleFunctions_for_v1.set('GetBase', objGetBase);
copatibleFunctions_for_v2.set('ObjGetBase', objGetBase);
copatibleFunctions_for_v2.set('GetBase', objGetBase);

const objCount: LibraryFunc = async(session, stackFrame, value) => {
  if (!(value instanceof dbgp.ObjectProperty)) {
    return '';
  }

  const children = await fetchPropertyOwnChildren(session, stackFrame, value);
  if (!children) {
    return 0;
  }

  return children.filter((child) => {
    if (2 <= session.ahkVersion.mejor && child.name.startsWith('[')) {
      return false;
    }
    return true;
  }).length;
};
copatibleFunctions_for_v1.set('ObjCount', objCount);
copatibleFunctions_for_v2.set('ObjOwnPropCount', objCount);

const createResolve = (defaultValueResolver: (session: dbgp.Session) => string | number): MathFunctionResolve => {
  return (value, session) => {
    if (isInfinite(value)) {
      return '';
    }

    if (typeof value === 'number') {
      return value;
    }
    return defaultValueResolver(session);
  };
};
type MathFunctionResolve = (value: any, session: dbgp.Session, stackFrame?: dbgp.StackFrame) => string | number;
const createMathFunction = (nameOrCallable: keyof typeof Math | ((value: number) => number), resolve: MathFunctionResolve): LibraryFunc => {
  return async(session, stackFrame, value) => {
    if (value === '') {
      return '';
    }

    const num = toNumber(value);
    if (num === '') {
      return Promise.resolve(resolve('', session, stackFrame));
    }

    const mathFunction = typeof nameOrCallable === 'function' ? nameOrCallable : Math[nameOrCallable];
    if (typeof mathFunction !== 'function') {
      throw Error('not function');
    }

    const result = resolve(mathFunction(num), session, stackFrame);
    if (typeof result === 'number') {
      return Promise.resolve(2 <= session.ahkVersion.mejor ? result : toNumber(result.toFixed(6)));
    }
    return Promise.resolve(result);
  };
};
const returnBlank: MathFunctionResolve = createResolve(() => '');
const returnZero: MathFunctionResolve = createResolve(() => 0);
const returnOne: MathFunctionResolve = createResolve((session) => (2 <= session.ahkVersion.mejor ? 1.0 : 1));

copatibleFunctions_for_v1.set('Abs', createMathFunction('abs', returnBlank));
copatibleFunctions_for_v2.set('Abs', createMathFunction('abs', returnBlank));

copatibleFunctions_for_v1.set('Ceil', createMathFunction('ceil', returnZero));
copatibleFunctions_for_v2.set('Ceil', createMathFunction('ceil', returnBlank));

copatibleFunctions_for_v1.set('Exp', createMathFunction('exp', returnOne));
copatibleFunctions_for_v2.set('Exp', createMathFunction('exp', returnBlank));

copatibleFunctions_for_v1.set('Floor', createMathFunction('floor', returnZero));
copatibleFunctions_for_v2.set('Floor', createMathFunction('floor', returnBlank));

const log = createMathFunction('log10', returnBlank);
copatibleFunctions_for_v1.set('Log', log);
copatibleFunctions_for_v2.set('Log', log);

const ln = createMathFunction('log', returnBlank);
copatibleFunctions_for_v1.set('Ln', ln);
copatibleFunctions_for_v2.set('Ln', ln);

const round: LibraryFunc = async(session, stackFrame, num, decimalPlaces) => {
  const target = Number(num);
  const n = Math.floor(decimalPlaces ? Number(decimalPlaces) : 0);
  if (isNaN(target) || isNaN(n)) {
    return 2 <= session.ahkVersion.mejor ? '' : 0;
  }

  if (n === 0) {
    return Math.round(target);
  }

  const factor = 10 ** 10;
  const result = Math.round(target * factor) / factor;
  return result;
};
copatibleFunctions_for_v1.set('Round', round);
copatibleFunctions_for_v2.set('Round', round);

copatibleFunctions_for_v1.set('Sqrt', createMathFunction('sqrt', returnZero));
copatibleFunctions_for_v2.set('Sqrt', createMathFunction('sqrt', returnBlank));

copatibleFunctions_for_v1.set('Sin', createMathFunction('sin', returnZero));
copatibleFunctions_for_v2.set('Sin', createMathFunction('sin', returnBlank));

copatibleFunctions_for_v1.set('Cos', createMathFunction('cos', returnOne));
copatibleFunctions_for_v2.set('Cos', createMathFunction('cos', returnBlank));

copatibleFunctions_for_v1.set('Tan', createMathFunction('tan', returnZero));
copatibleFunctions_for_v2.set('Tan', createMathFunction('tan', returnBlank));

copatibleFunctions_for_v1.set('ASin', createMathFunction('asin', returnZero));
copatibleFunctions_for_v2.set('ASin', createMathFunction('asin', returnBlank));

copatibleFunctions_for_v1.set('ACos', createMathFunction('acos', createResolve(() => 1.570796)));
copatibleFunctions_for_v2.set('ACos', createMathFunction('acos', returnBlank));

copatibleFunctions_for_v1.set('ATan', createMathFunction('atan', returnZero));
copatibleFunctions_for_v2.set('ATan', createMathFunction('atan', returnBlank));

const createMaxMinFunction = (funcName: 'max' | 'min'): LibraryFunc => {
  return async(session, stackFrame, ...values) => {
    const numbers = values.map((element) => toNumber(element)).filter((element): element is number => typeof element === 'number');
    if (values.length !== numbers.length) {
      return Promise.resolve('');
    }

    const result = Math[funcName](...numbers);
    if (isInfinite(result)) {
      return Promise.resolve('');
    }
    return Promise.resolve(result);
  };
};

const max = createMaxMinFunction('max');
copatibleFunctions_for_v1.set('Max', max);
copatibleFunctions_for_v2.set('Max', max);

const min = createMaxMinFunction('min');
copatibleFunctions_for_v1.set('Min', min);
copatibleFunctions_for_v2.set('Min', min);

const mod: LibraryFunc = async(session, stackFrame, ...values) => {
  const numbers = values.map((element) => toNumber(element)).filter((element): element is number => typeof element === 'number');
  if (values.length !== numbers.length) {
    return Promise.resolve('');
  }
  if (numbers.length !== 2) {
    return Promise.resolve('');
  }

  const [ dividend, divisor ] = numbers;
  return Promise.resolve(dividend % divisor);
};
copatibleFunctions_for_v1.set('Mod', mod);
copatibleFunctions_for_v2.set('Mod', mod);
// #endregion Compatible functions with AutoHotkey

// #region Compatibility functions with AutoHotkey
const strLen: LibraryFunc = async(session, stackFrame, value) => {
  if (typeof value === 'string') {
    return Promise.resolve(value.length);
  }
  if (typeof value === 'number') {
    return Promise.resolve(String(value).length);
  }

  if (2 <= session.ahkVersion.mejor) {
    return Promise.resolve('');
  }
  return Promise.resolve(0);
};
imcopatibleFunctions_for_v1.set('StrLen', strLen);
copatibleFunctions_for_v2.set('StrLen', strLen);

const isInteger: LibraryFunc = async(session, stackFrame, value) => {
  const num = toNumber(value);
  if (typeof num === 'number' && Number.isInteger(num)) {
    return getTrue(session, stackFrame);
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsInteger', isInteger);
copatibleFunctions_for_v2.set('IsInteger', isInteger);

const isFloat: LibraryFunc = async(session, stackFrame, value) => {
  const num = toNumber(value);
  if (typeof num === 'number' && util.isFloat(num)) {
    return getTrue(session, stackFrame);
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsFloat', isFloat);
copatibleFunctions_for_v2.set('IsFloat', isFloat);

const isNumber: LibraryFunc = async(session, stackFrame, value) => {
  const num = toNumber(value);
  if (num === '') {
    return getFalse(session, stackFrame);
  }

  if (typeof num === 'number') {
    return getTrue(session, stackFrame);
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsNumber', isNumber);
copatibleFunctions_for_v2.set('IsNumber', isNumber);

const createStringPredicate = (regexp: RegExp): LibraryFunc => {
  return async(session, stackFrame, value) => {
    if (typeof value !== 'string') {
      return '';
    }

    if (regexp.test(value)) {
      return getTrue(session, stackFrame);
    }
    return getFalse(session, stackFrame);
  };
};
const isDigit = createStringPredicate(/^\d+$/u);
imcopatibleFunctions_for_v1.set('IsDigit', isDigit);
copatibleFunctions_for_v2.set('IsDigit', isDigit);

const isXDigit = createStringPredicate(/^(0x)?[\da-fA-F]+$/u);
imcopatibleFunctions_for_v1.set('IsXDigit', isXDigit);
copatibleFunctions_for_v2.set('IsXDigit', isXDigit);

const isAlpha = createStringPredicate(/^[a-zA-Z]+$/u);
imcopatibleFunctions_for_v1.set('IsAlpha', isAlpha);
copatibleFunctions_for_v2.set('IsAlpha', isAlpha);


const isAlnum = createStringPredicate(/^[a-zA-Z0-9]+$/u);
imcopatibleFunctions_for_v1.set('IsAlnum', isAlnum);
copatibleFunctions_for_v2.set('IsAlnum', isAlnum);

const isSpace = createStringPredicate(/^\s+$/u);
imcopatibleFunctions_for_v1.set('IsSpace', isSpace);
copatibleFunctions_for_v2.set('IsSpace', isSpace);

const isUpper = createStringPredicate(/^[A-Z]+$/u);
imcopatibleFunctions_for_v1.set('IsUpper', isUpper);
copatibleFunctions_for_v2.set('IsUpper', isUpper);

const isLower = createStringPredicate(/^[a-z]+$/u);
imcopatibleFunctions_for_v1.set('IsLower', isLower);
copatibleFunctions_for_v2.set('IsLower', isLower);

// const normalizeCaseSensitive = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, caseSensitive: EvaluatedValue): Promise<'On' | 'Off' | 'Locale' | undefined> => {
//   if (caseSensitive === undefined) {
//     return 'Off';
//   }
//   if (caseSensitive === await getTrue(session, stackFrame)) {
//     return 'On';
//   }
//   if (caseSensitive === await getFalse(session, stackFrame)) {
//     return 'Off';
//   }
//
//   if (typeof caseSensitive === 'string') {
//     if (equalsIgnoreCase(caseSensitive, 'On')) {
//       return 'On';
//     }
//     else if (equalsIgnoreCase(caseSensitive, 'Off')) {
//       return 'Off';
//     }
//     else if (equalsIgnoreCase(caseSensitive, 'Locale')) {
//       return 'Locale';
//     }
//   }
//
//   if (2 <= session.ahkVersion.mejor) {
//     return undefined;
//   }
//   return caseSensitive ? 'On' : 'Off';
// };
// const inStr: LibraryFunc = async(session, stackFrame, hayStack, needle, caseSensitive?, startingPos = 1, occurance = 1) => {
//   if (typeof hayStack !== 'string') {
//     return 2 <= session.ahkVersion.mejor ? '' : 0;
//   }
//   if (typeof needle !== 'string') {
//     return 2 <= session.ahkVersion.mejor ? '' : 0;
//   }
//   if (typeof startingPos !== 'number') {
//     return 2 <= session.ahkVersion.mejor ? '' : 0;
//   }
//   if (2 <= session.ahkVersion.mejor && startingPos === 0) {
//     return '';
//   }
//   if (typeof occurance !== 'number') {
//     return 2 <= session.ahkVersion.mejor ? '' : 0;
//   }
//
//   const normalizedCaseSensitive = await normalizeCaseSensitive(session, stackFrame, caseSensitive);
//   if (!normalizedCaseSensitive) {
//     return 2 <= session.ahkVersion.mejor ? '' : 0;
//   }
//
//   // Not support
//   if (normalizedCaseSensitive === 'Locale') {
//     return 2 <= session.ahkVersion.mejor ? '' : 0;
//   }
//
//   const _hayStack = normalizedCaseSensitive === 'Off' ? hayStack.toLowerCase() : hayStack;
//   const _needle = normalizedCaseSensitive === 'Off' ? needle.toLowerCase() : needle;
//   const isLastFound = 2 <= session.ahkVersion.mejor && occurance !== 1 ? startingPos < 1 : startingPos < 0;
//
//   let currentPosition = Math.abs(startingPos - 1);
//   for (let i = occurance; 0 < i; i--) {
//     const index = isLastFound ? _hayStack.lastIndexOf(_needle, currentPosition) : _hayStack.indexOf(_needle, currentPosition);
//     if (index === -1) {
//       return 0;
//     }
//     currentPosition = index + 1;
//   }
//   return currentPosition;
// };
//
// imcopatibleFunctions_for_v1.set('InStr', inStr);
// copatibleFunctions_for_v2.set('InStr', inStr);
// #endregion Compatibility functions with AutoHotkey

// #region Incompatible functions with AutoHotkey
const kindOf: LibraryFunc = async(session, stackFrame, object) => {
  if (typeof object !== 'object') {
    return '';
  }

  if (!(object instanceof dbgp.ObjectProperty)) {
    return '';
  }
  return Promise.resolve(object.className);
};
imcopatibleFunctions_for_v1.set('KindOf', kindOf);
imcopatibleFunctions_for_v2.set('KindOf', kindOf);

const instanceOf: LibraryFunc = async(session, stackFrame, object, superClass) => {
  if (typeof object !== 'object' || typeof superClass !== 'object') {
    return '';
  }

  if (!(object instanceof dbgp.ObjectProperty)) {
    return 0;
  }
  if (!(superClass instanceof dbgp.ObjectProperty)) {
    return 0;
  }

  const baseClass = await fetchProperty(session, `${object.fullName}.<base>`, stackFrame);
  if (!(baseClass instanceof dbgp.ObjectProperty)) {
    return 0;
  }

  if (2 <= session.ahkVersion.mejor) {
    const prototype = await fetchProperty(session, `${superClass.fullName}.Prototype`, stackFrame);
    if (!(prototype instanceof dbgp.ObjectProperty)) {
      return 0;
    }

    if (baseClass.address === prototype.address) {
      return 1;
    }
  }
  else if (baseClass.address === superClass.address) {
    return 1;
  }

  return instanceOf(session, stackFrame, baseClass, superClass);
};
imcopatibleFunctions_for_v1.set('InstanceOf', instanceOf);
imcopatibleFunctions_for_v2.set('InstanceOf', instanceOf);

const isPrimitive: LibraryFunc = async(session, stackFrame, value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return Promise.resolve(1);
  }
  return Promise.resolve(0);
};
imcopatibleFunctions_for_v1.set('IsPrimitive', isPrimitive);
imcopatibleFunctions_for_v2.set('IsPrimitive', isPrimitive);

const isClass: LibraryFunc = async(session, stackFrame, value) => {
  if (!(value instanceof dbgp.ObjectProperty)) {
    return '';
  }

  if (value.className === 'Class') {
    return Promise.resolve(1);
  }
  return Promise.resolve(0);
};
imcopatibleFunctions_for_v1.set('IsClass', isClass);
imcopatibleFunctions_for_v2.set('IsClass', isClass);

const isDate: LibraryFunc = async(session, stackFrame, value) => {
  if (typeof value !== 'string') {
    return Promise.resolve('');
  }

  if (Number.isFinite(Date.parse(value))) {
    return Promise.resolve(1);
  }
  return Promise.resolve(0);
};
imcopatibleFunctions_for_v1.set('IsDate', isDate);
imcopatibleFunctions_for_v2.set('IsDate', isDate);

const isFile: LibraryFunc = async(session, stackFrame, filePath) => {
  if (typeof filePath !== 'string') {
    return '';
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      return 1;
    }
  }
  catch (e: unknown) {
  }
  return 0;
};
imcopatibleFunctions_for_v1.set('IsFile', isFile);
imcopatibleFunctions_for_v2.set('IsFile', isFile);

const isDirectory: LibraryFunc = async(session, stackFrame, filePath) => {
  if (typeof filePath !== 'string') {
    return '';
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      return 1;
    }
  }
  catch (e: unknown) {
  }
  return 0;
};
imcopatibleFunctions_for_v1.set('IsDirectory', isDirectory);
imcopatibleFunctions_for_v1.set('IsDir', isDirectory);
imcopatibleFunctions_for_v2.set('IsDirectory', isDirectory);
imcopatibleFunctions_for_v2.set('IsDir', isDirectory);

const isPath: LibraryFunc = async(session, stackFrame, filePath) => {
  if (typeof filePath !== 'string') {
    return '';
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile() || stat.isDirectory()) {
      return 1;
    }
  }
  catch (e: unknown) {
  }
  return 0;
};
imcopatibleFunctions_for_v1.set('IsPath', isPath);
imcopatibleFunctions_for_v2.set('IsPath', isPath);

const toBinary: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    return Promise.resolve(decimal.toString(2));
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToBinary', toBinary);
imcopatibleFunctions_for_v2.set('ToBinary', toBinary);
formatSpecifiers_v1.set('b', toBinary);
formatSpecifiers_v2.set('b', toBinary);

const toDecimal: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    return Promise.resolve(decimal);
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToDecimal', toDecimal);
imcopatibleFunctions_for_v2.set('ToDecimal', toDecimal);
formatSpecifiers_v1.set('d', toDecimal);
formatSpecifiers_v2.set('d', toDecimal);

const toOctal: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    return Promise.resolve(Number(decimal.toString(8)));
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToOctal', toOctal);
imcopatibleFunctions_for_v2.set('ToOctal', toOctal);
formatSpecifiers_v1.set('o', toOctal);
formatSpecifiers_v2.set('o', toOctal);

const toHex: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    const isPositive = 0 <= decimal;
    const hex = Math.abs(decimal).toString(16);
    return Promise.resolve(isPositive ? `0x${hex}` : `-0x${hex}`);
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToHex', toHex);
imcopatibleFunctions_for_v2.set('ToHex', toHex);
formatSpecifiers_v1.set('h', toHex);
formatSpecifiers_v2.set('h', toHex);
formatSpecifiers_v1.set('x', toHex);
formatSpecifiers_v2.set('x', toHex);

const toHexWithoutPrefix: LibraryFunc = async(session, StackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    return Promise.resolve(decimal.toString(16));
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToHexWithoutPrefix', toHexWithoutPrefix);
imcopatibleFunctions_for_v2.set('ToHexWithoutPrefix', toHexWithoutPrefix);
formatSpecifiers_v1.set('xb', toHexWithoutPrefix);
formatSpecifiers_v2.set('xb', toHexWithoutPrefix);
formatSpecifiers_v1.set('hb', toHexWithoutPrefix);
formatSpecifiers_v2.set('hb', toHexWithoutPrefix);

const toUpperHex: LibraryFunc = async(session, StackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    const isPositive = 0 <= decimal;
    const hex = Math.abs(decimal).toString(16).toUpperCase();
    return Promise.resolve(isPositive ? `0x${hex}` : `-0x${hex}`);
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToUpperHex', toUpperHex);
imcopatibleFunctions_for_v2.set('ToUpperHex', toUpperHex);
formatSpecifiers_v1.set('H', toUpperHex);
formatSpecifiers_v2.set('H', toUpperHex);
formatSpecifiers_v1.set('X', toUpperHex);
formatSpecifiers_v2.set('X', toUpperHex);

const toUpperHexWithoutPrefix: LibraryFunc = async(session, StackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isFinite(decimal)) {
    return Promise.resolve(decimal.toString(16).toUpperCase());
  }
  return '';
};
imcopatibleFunctions_for_v1.set('ToUpperHexWithoutPrefix', toUpperHexWithoutPrefix);
imcopatibleFunctions_for_v2.set('ToUpperHexWithoutPrefix', toUpperHexWithoutPrefix);
formatSpecifiers_v1.set('Xb', toUpperHexWithoutPrefix);
formatSpecifiers_v2.set('Xb', toUpperHexWithoutPrefix);
formatSpecifiers_v1.set('Hb', toUpperHexWithoutPrefix);
formatSpecifiers_v2.set('Hb', toUpperHexWithoutPrefix);

const dumpLimit = 10000;
export const propertyToJsValue = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, value: EvaluatedValue | dbgp.Property, config: { stack: number[]; limit: number } = { stack: [], limit: dumpLimit }): Promise<undefined | string | number | Record<any, any> | any[]> => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (value instanceof dbgp.PrimitiveProperty) {
    return value.type === 'string' ? value.value : toNumber(value.value);
  }
  if (value instanceof MetaVariable) {
    return value;
  }

  const limitLabel = '[LIMIT]';
  if (config.limit === 0) {
    return limitLabel;
  }

  if (value instanceof dbgp.ObjectProperty) {
    config.stack.push(value.address);
    let children = (await fetchPropertyOwnChildren(session, stackFrame, value));
    if (!children) {
      return {};
    }

    let isLimitOver = config.limit < children.length;
    if (isLimitOver) {
      children = children.slice(0, config.limit);
    }
    config.limit = Math.max(config.limit - children.length, 0);

    if (value.isArray) {
      const result: any[] = [];
      const elements = children.filter((child) => child.isIndexKey);
      for await (const element of elements) {
        if (element instanceof dbgp.ObjectProperty && config.stack.includes(element.address)) {
          result.push('[Circular]');
          continue;
        }

        const stringifiedElement = await propertyToJsValue(session, stackFrame, element, config);
        result.push(stringifiedElement);
        if (config.limit === 0) {
          isLimitOver = true;
          break;
        }
      }

      config.stack.pop();
      if (isLimitOver) {
        result.push(limitLabel);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    }

    const result: Record<any, any> = {};
    for await (const child of children) {
      const name = child.key ?? child.index ?? child.name;
      if (child instanceof dbgp.ObjectProperty && config.stack.includes(child.address)) {
        result[name] = '[Circular]';
        continue;
      }

      result[name] = await propertyToJsValue(session, stackFrame, child, config);
      if (config.limit === 0) {
        isLimitOver = true;
        break;
      }
    }

    config.stack.pop();
    if (isLimitOver) {
      result[limitLabel] = limitLabel;
    }
    return result;
  }

  return undefined;
};
export const toJsonString: LibraryFunc = async(session, stackFrame, value, indent = 4, limit = dumpLimit) => {
  const _limit = toNumber(limit);
  if (typeof _limit !== 'number') {
    return '';
  }
  if (typeof indent !== 'number' && typeof indent !== 'string') {
    return '';
  }

  const jsValue = await propertyToJsValue(session, stackFrame, value, { stack: [], limit: _limit });
  const jsonString = JSON.stringify(jsValue, undefined, indent);
  return jsonString;
};
imcopatibleFunctions_for_v1.set('ToJsonString', toJsonString);
imcopatibleFunctions_for_v2.set('ToJsonString', toJsonString);
formatSpecifiers_v1.set('J', toJsonString);
formatSpecifiers_v2.set('J', toJsonString);

export const toOnelineJsonString: LibraryFunc = async(session, stackFrame, value, limit = dumpLimit) => {
  return toJsonString(session, stackFrame, value, 0, limit);
};
imcopatibleFunctions_for_v1.set('ToOneLineJsonString', toOnelineJsonString);
imcopatibleFunctions_for_v2.set('ToOneLineJsonString', toOnelineJsonString);
formatSpecifiers_v1.set('Jo', toOnelineJsonString);
formatSpecifiers_v2.set('Jo', toOnelineJsonString);
// #endregion

export const allFunctions_for_v1 = new CaseInsensitiveMap([
  ...copatibleFunctions_for_v1,
  ...imcopatibleFunctions_for_v1,
]);
export const allFunctions_for_v2 = new CaseInsensitiveMap([
  ...copatibleFunctions_for_v2,
  ...imcopatibleFunctions_for_v2,
]);
