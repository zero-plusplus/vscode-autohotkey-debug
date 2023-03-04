import { promises as fs } from 'fs';
import glob from 'fast-glob';
import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { equalsIgnoreCase } from '../stringUtils';
import { EvaluatedValue, fetchGlobalProperty, fetchProperty, fetchPropertyChild, fetchPropertyChildren, includesPropertyChild, isInfinite } from './ExpressionEvaluator';
import * as util from '../util';

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
  const number = Number(value);
  if (isNaN(number)) {
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
    const children = await fetchPropertyChildren(session, stackFrame, value);
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

  const children = await fetchPropertyChildren(session, stackFrame, value);
  if (!children) {
    return 0;
  }

  return children.filter((child) => {
    if (child.name.startsWith('<')) {
      return false;
    }
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

copatibleFunctions_for_v1.set('Round', createMathFunction('round', returnZero));
copatibleFunctions_for_v2.set('Round', createMathFunction('round', returnBlank));

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
// #endregion Compatibility functions with AutoHotkey

// #region Incompatible functions with AutoHotkey

const instanceOf: LibraryFunc = async(session, stackFrame, object, superClass) => {
  if (!(object instanceof dbgp.ObjectProperty)) {
    return getFalse(session, stackFrame);
  }
  if (!(superClass instanceof dbgp.ObjectProperty)) {
    return getFalse(session, stackFrame);
  }

  const baseClass = await fetchProperty(session, `${object.fullName}.base`, stackFrame);
  if (!(baseClass instanceof dbgp.ObjectProperty)) {
    return getFalse(session, stackFrame);
  }

  if (baseClass.address === superClass.address) {
    return getTrue(session, stackFrame);
  }

  return instanceOf(session, stackFrame, baseClass, superClass);
};
imcopatibleFunctions_for_v1.set('InstanceOf', instanceOf);
imcopatibleFunctions_for_v2.set('InstanceOf', instanceOf);

const countOf: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty) {
    const children = await fetchPropertyChildren(session, stackFrame, value);
    return children?.length ?? 0;
  }
  return String(value).length;
};
imcopatibleFunctions_for_v1.set('CountOf', countOf);
imcopatibleFunctions_for_v2.set('CountOf', countOf);

const isString: LibraryFunc = async(session, stackFrame, value) => {
  return typeof value === 'string' ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsString', isString);
imcopatibleFunctions_for_v2.set('IsString', isString);

const isHexLike: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^0x[0-9a-fA-F]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsHexLike', isHexLike);
imcopatibleFunctions_for_v2.set('IsHexLike', isHexLike);

const isPrimitive: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || !(typeof value === 'string' || typeof value === 'number')) {
    return getFalse(session, stackFrame);
  }
  return getTrue(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsPrimitive', isPrimitive);
imcopatibleFunctions_for_v2.set('IsPrimitive', isPrimitive);

const isAlpha: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[a-zA-Z]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsAlpha', isAlpha);
imcopatibleFunctions_for_v2.set('IsAlpha', isAlpha);

const isAlnum: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[a-zA-Z0-9]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsAlnum', isAlnum);
imcopatibleFunctions_for_v2.set('IsAlnum', isAlnum);

const isUpper: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[A-Z]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsUpper', isUpper);
imcopatibleFunctions_for_v2.set('IsUpper', isUpper);

const isLower: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[a-z]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsLower', isLower);
imcopatibleFunctions_for_v2.set('IsLower', isLower);

const isTime: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return Number.isNaN(Date.parse(value)) ? getFalse(session, stackFrame) : getTrue(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsTime', isTime);
imcopatibleFunctions_for_v2.set('IsTime', isTime);

const isSpace: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^\s+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsSpace', isSpace);
imcopatibleFunctions_for_v2.set('IsSpace', isSpace);

const isClass: LibraryFunc = async(session, stackFrame, value, name) => {
  if (!(value instanceof dbgp.ObjectProperty)) {
    return getFalse(session, stackFrame);
  }

  const className = await fetchProperty(session, `${value.fullName}.__CLASS`, stackFrame);
  const superClassName = await fetchProperty(session, `${value.fullName}.base.__CLASS`, stackFrame);
  if (!className) {
    return getFalse(session, stackFrame);
  }
  if (superClassName && className !== superClassName) {
    return getFalse(session, stackFrame);
  }

  if (name) {
    if (typeof name === 'string') {
      return className === name ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
    }
    if (name instanceof dbgp.ObjectProperty) {
      const _name = await fetchProperty(session, `${name.fullName}.__CLASS`, stackFrame);
      return className === _name ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
    }
    return getFalse(session, stackFrame);
  }
  return getTrue(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsClass', isClass);
imcopatibleFunctions_for_v2.set('IsClass', isClass);

const isFile: LibraryFunc = async(session, stackFrame, filePath) => {
  if (typeof filePath !== 'string') {
    return getFalse(session, stackFrame);
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      return await getTrue(session, stackFrame);
    }
  }
  catch (e: unknown) {
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsFile', isFile);
imcopatibleFunctions_for_v2.set('IsFile', isFile);

const isDirectory: LibraryFunc = async(session, stackFrame, filePath) => {
  if (typeof filePath !== 'string') {
    return getFalse(session, stackFrame);
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      return await getTrue(session, stackFrame);
    }
  }
  catch (e: unknown) {
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsDirectory', isDirectory);
imcopatibleFunctions_for_v1.set('IsDir', isDirectory);
imcopatibleFunctions_for_v2.set('IsDirectory', isDirectory);
imcopatibleFunctions_for_v2.set('IsDir', isDirectory);

const isPath: LibraryFunc = async(session, stackFrame, filePath) => {
  const result = await isFile(session, stackFrame, filePath);
  if (result === await getFalse(session, stackFrame)) {
    return isDirectory(session, stackFrame, filePath);
  }
  return result;
};
imcopatibleFunctions_for_v1.set('IsPath', isPath);
imcopatibleFunctions_for_v2.set('IsPath', isPath);

const isGlob: LibraryFunc = async(session, stackFrame, filePattern) => {
  if (typeof filePattern !== 'string') {
    return getFalse(session, stackFrame);
  }

  const _filePattern = filePattern.replaceAll('\\', '/');
  const fileList = await glob(_filePattern, { });
  if (0 < fileList.length) {
    return getTrue(session, stackFrame);
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsGlob', isGlob);
imcopatibleFunctions_for_v2.set('IsGlob', isGlob);

const regexHasKey: LibraryFunc = async(session, stackFrame, value, regexKey) => {
  if (!(value instanceof dbgp.ObjectProperty)) {
    return getFalse(session, stackFrame);
  }
  if (typeof regexKey !== 'string') {
    return getFalse(session, stackFrame);
  }

  const children = await fetchPropertyChildren(session, stackFrame, value);
  if (!children) {
    return getFalse(session, stackFrame);
  }

  for (const child of children) {
    if (ahkRegexMatch(child.name, regexKey)) {
      return getTrue(session, stackFrame);
    }
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('RegExHasKey', regexHasKey);
imcopatibleFunctions_for_v2.set('RegExHasKey', regexHasKey);
imcopatibleFunctions_for_v2.set('RegExHasOwnProp', regexHasKey);

const contains: LibraryFunc = async(session, stackFrame, value, searchValue, ignoreCase) => {
  if (typeof searchValue !== 'string') {
    return getFalse(session, stackFrame);
  }

  if (!(value instanceof dbgp.ObjectProperty)) {
    if (typeof value === 'undefined') {
      return getFalse(session, stackFrame);
    }
    const result = toNumber(ignoreCase) === 1
      ? String(value).toLowerCase().includes(searchValue.toLowerCase())
      : String(value).includes(searchValue);
    return result ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
  }

  const children = await fetchPropertyChildren(session, stackFrame, value);
  if (!children) {
    return getFalse(session, stackFrame);
  }

  for (const child of children) {
    if (child instanceof dbgp.PrimitiveProperty) {
      const result = toNumber(ignoreCase) === 1
        ? equalsIgnoreCase(child.value, searchValue)
        : child.value === searchValue;
      if (result) {
        return getTrue(session, stackFrame);
      }
    }
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('Contains', contains);
imcopatibleFunctions_for_v1.set('Includes', contains);
imcopatibleFunctions_for_v2.set('Contains', contains);
imcopatibleFunctions_for_v2.set('Includes', contains);

const toBinary: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(decimal.toString(2));
};
imcopatibleFunctions_for_v1.set('ToBinary', toBinary);
imcopatibleFunctions_for_v2.set('ToBinary', toBinary);
formatSpecifiers_v1.set('b', toBinary);
formatSpecifiers_v2.set('b', toBinary);

const toDecimal: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(decimal);
};
imcopatibleFunctions_for_v1.set('ToDecimal', toDecimal);
imcopatibleFunctions_for_v2.set('ToDecimal', toDecimal);
formatSpecifiers_v1.set('d', toDecimal);
formatSpecifiers_v2.set('d', toDecimal);

const toOctal: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(decimal.toString(8));
};
imcopatibleFunctions_for_v1.set('ToOctal', toOctal);
imcopatibleFunctions_for_v2.set('ToOctal', toOctal);
formatSpecifiers_v1.set('o', toOctal);
formatSpecifiers_v2.set('o', toOctal);

const toHex: LibraryFunc = async(session, stackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(`0x${decimal.toString(16)}`);
};
imcopatibleFunctions_for_v1.set('ToHex', toHex);
imcopatibleFunctions_for_v2.set('ToHex', toHex);
formatSpecifiers_v1.set('h', toHex);
formatSpecifiers_v2.set('h', toHex);
formatSpecifiers_v1.set('x', toHex);
formatSpecifiers_v2.set('x', toHex);

const toUpperHex: LibraryFunc = async(session, StackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(`0x${decimal.toString(16).toUpperCase()}`);
};
imcopatibleFunctions_for_v1.set('ToUpperHex', toUpperHex);
imcopatibleFunctions_for_v2.set('ToUpperHex', toUpperHex);
formatSpecifiers_v1.set('H', toUpperHex);
formatSpecifiers_v2.set('H', toUpperHex);
formatSpecifiers_v1.set('X', toUpperHex);
formatSpecifiers_v2.set('X', toUpperHex);

const toHexWithoutPrefix: LibraryFunc = async(session, StackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(`${decimal.toString(16)}`);
};
imcopatibleFunctions_for_v1.set('ToHexWithoutPrefix', toHexWithoutPrefix);
imcopatibleFunctions_for_v2.set('ToHexWithoutPrefix', toHexWithoutPrefix);
formatSpecifiers_v1.set('xb', toHexWithoutPrefix);
formatSpecifiers_v2.set('xb', toHexWithoutPrefix);
formatSpecifiers_v1.set('hb', toHexWithoutPrefix);
formatSpecifiers_v2.set('hb', toHexWithoutPrefix);

const toUpperHexWithoutPrefix: LibraryFunc = async(session, StackFrame, value) => {
  const decimal = parseInt(String(value), 10);
  if (isNaN(decimal)) {
    return '';
  }
  return Promise.resolve(`${decimal.toString(16).toUpperCase()}`);
};
imcopatibleFunctions_for_v1.set('ToUpperHexWithoutPrefix', toUpperHexWithoutPrefix);
imcopatibleFunctions_for_v2.set('ToUpperHexWithoutPrefix', toUpperHexWithoutPrefix);
formatSpecifiers_v1.set('Xb', toUpperHexWithoutPrefix);
formatSpecifiers_v2.set('Xb', toUpperHexWithoutPrefix);
formatSpecifiers_v1.set('Hb', toUpperHexWithoutPrefix);
formatSpecifiers_v2.set('Hb', toUpperHexWithoutPrefix);
// #endregion

export const allFunctions_for_v1 = new CaseInsensitiveMap([
  ...copatibleFunctions_for_v1,
  ...imcopatibleFunctions_for_v1,
]);
export const allFunctions_for_v2 = new CaseInsensitiveMap([
  ...copatibleFunctions_for_v2,
  ...imcopatibleFunctions_for_v2,
]);
