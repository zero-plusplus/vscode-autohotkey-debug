import { promises as fs } from 'fs';
import glob from 'fast-glob';
import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { equalsIgnoreCase } from '../stringUtils';
import { EvaluatedValue, fetchGlobalProperty, fetchProperty, fetchPropertyChild, fetchPropertyChildren, includesPropertyChild } from './ExpressionEvaluator';

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
copatibleFunctions_for_v1.set('StrLen', strLen);
copatibleFunctions_for_v2.set('StrLen', strLen);
// #endregion

// #region Compatibility functions with AutoHotkey
const isInteger: LibraryFunc = async(session, stackFrame, value) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return getTrue(session, stackFrame);
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsInteger', isInteger);
copatibleFunctions_for_v2.set('IsInteger', isInteger);
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

const isNumber: LibraryFunc = async(session, stackFrame, value) => {
  return typeof value === 'number' ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsNumber', isNumber);
imcopatibleFunctions_for_v2.set('IsNumber', isNumber);

const isNumberLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isNumber(session, stackFrame, toNumber(value));
    case 'number': return getTrue(session, stackFrame);
    default: break;
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsNumberLike', isNumberLike);
imcopatibleFunctions_for_v2.set('IsNumberLike', isNumberLike);

const isIntegerLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isInteger(session, stackFrame, toNumber(value));
    case 'number': return isInteger(session, stackFrame, value);
    default: break;
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsIntegerLike', isIntegerLike);
imcopatibleFunctions_for_v2.set('IsIntegerLike', isIntegerLike);

const isFloat: LibraryFunc = async(session, stackFrame, value) => {
  if (!(await isNumber(session, stackFrame, value))) {
    return getFalse(session, stackFrame);
  }
  return typeof value === 'number' && (value % 1 !== 0)
    ? getTrue(session, stackFrame)
    : getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsFloat', isFloat);
imcopatibleFunctions_for_v2.set('IsFloat', isFloat);

const isFloatLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isFloat(session, stackFrame, toNumber(value));
    case 'number': return isFloat(session, stackFrame, value);
    default: break;
  }
  return getFalse(session, stackFrame);
};
imcopatibleFunctions_for_v1.set('IsFloatLike', isFloatLike);
imcopatibleFunctions_for_v2.set('IsFloatLike', isFloatLike);

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
