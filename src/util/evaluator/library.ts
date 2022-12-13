import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { equalsIgnoreCase } from '../stringUtils';
import { EvaluatedValue, fetchGlobalProperty, fetchProperty, fetchPropertyChild, fetchPropertyChildren } from './ExpressionEvaluator';

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

export type LibraryFunc = (session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, ...params: EvaluatedValue[]) => Promise<EvaluatedValue>;

export const library_for_v1 = new CaseInsensitiveMap<string, LibraryFunc>();
export const library_for_v2 = new CaseInsensitiveMap<string, LibraryFunc>();


// #region Built-in like functions
// https://www.autohotkey.com/docs/lib/Object.htm#HasKey
const hasKey: LibraryFunc = async(session, stackFrame, value, key) => {
  if (!(value instanceof dbgp.ObjectProperty)) {
    return getFalse(session, stackFrame);
  }

  const child = await fetchPropertyChild(session, stackFrame, value, key);
  return child ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('HasKey', hasKey);
library_for_v1.set('ObjHasKey', hasKey);
library_for_v2.set('HasKey', hasKey);
library_for_v2.set('HasOwnProp', hasKey);
library_for_v2.set('ObjHasOwnProp', hasKey);
// #endregion

// #region original functions
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
library_for_v1.set('InstanceOf', instanceOf);
library_for_v2.set('InstanceOf', instanceOf);

const countOf: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty) {
    const children = await fetchPropertyChildren(session, stackFrame, value);
    return children?.length ?? 0;
  }
  return String(value).length;
};
library_for_v1.set('CountOf', countOf);
library_for_v2.set('CountOf', countOf);

const isSet: LibraryFunc = async(session, stackFrame, value) => {
  return value === '' ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsSet', isSet);
library_for_v2.set('IsSet', isSet);
library_for_v1.set('IsUndefined', isSet);
library_for_v2.set('IsUndefined', isSet);

const isString: LibraryFunc = async(session, stackFrame, value) => {
  return typeof value === 'string' ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsString', isString);
library_for_v2.set('IsString', isString);

const isNumber: LibraryFunc = async(session, stackFrame, value) => {
  return typeof value === 'number' ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsNumber', isNumber);
library_for_v2.set('IsNumber', isNumber);

const isNumberLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isNumber(session, stackFrame, toNumber(value));
    case 'number': return getTrue(session, stackFrame);
    default: break;
  }
  return getFalse(session, stackFrame);
};
library_for_v1.set('IsNumberLike', isNumberLike);
library_for_v2.set('IsNumberLike', isNumberLike);

const isInteger: LibraryFunc = async(session, stackFrame, value) => {
  if (!(await isNumber(session, stackFrame, value))) {
    return getFalse(session, stackFrame);
  }
  return Number.isInteger(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsInteger', isInteger);
library_for_v2.set('IsInteger', isInteger);

const isIntegerLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isInteger(session, stackFrame, toNumber(value));
    case 'number': return isInteger(session, stackFrame, value);
    default: break;
  }
  return getFalse(session, stackFrame);
};
library_for_v1.set('IsIntegerLike', isIntegerLike);
library_for_v2.set('IsIntegerLike', isIntegerLike);

const isFloat: LibraryFunc = async(session, stackFrame, value) => {
  if (!(await isNumber(session, stackFrame, value))) {
    return getFalse(session, stackFrame);
  }
  return typeof value === 'number' && (value % 1 !== 0)
    ? getTrue(session, stackFrame)
    : getFalse(session, stackFrame);
};
library_for_v1.set('IsFloat', isFloat);
library_for_v2.set('IsFloat', isFloat);

const isFloatLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isFloat(session, stackFrame, toNumber(value));
    case 'number': return isFloat(session, stackFrame, value);
    default: break;
  }
  return getFalse(session, stackFrame);
};
library_for_v1.set('IsFloatLike', isFloatLike);
library_for_v2.set('IsFloatLike', isFloatLike);

const isHexLike: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^0x[0-9a-fA-F]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsHexLike', isHexLike);
library_for_v2.set('IsHexLike', isHexLike);

const isPrimitive: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || value === '0' || value === '') {
    return getFalse(session, stackFrame);
  }
  return getTrue(session, stackFrame);
};
library_for_v1.set('IsPrimitive', isPrimitive);
library_for_v2.set('IsPrimitive', isPrimitive);

const isObject: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty) {
    return getTrue(session, stackFrame);
  }
  return getFalse(session, stackFrame);
};
library_for_v1.set('IsObject', isObject);
library_for_v2.set('IsObject', isObject);

const isAlpha: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[a-zA-Z]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsAlpha', isAlpha);
library_for_v2.set('IsAlpha', isAlpha);

const isAlnum: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[a-zA-Z0-9]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsAlnum', isAlnum);
library_for_v2.set('IsAlnum', isAlnum);

const isUpper: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[A-Z]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsUpper', isUpper);
library_for_v2.set('IsUpper', isUpper);

const isLower: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^[a-z]+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsLower', isLower);
library_for_v2.set('IsLower', isLower);

const isTime: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return Number.isNaN(Date.parse(value)) ? getFalse(session, stackFrame) : getTrue(session, stackFrame);
};
library_for_v1.set('IsTime', isTime);
library_for_v2.set('IsTime', isTime);

const isSpace: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return getFalse(session, stackFrame);
  }
  return (/^\s+$/u).test(value) ? getTrue(session, stackFrame) : getFalse(session, stackFrame);
};
library_for_v1.set('IsSpace', isSpace);
library_for_v2.set('IsSpace', isSpace);

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
library_for_v1.set('IsClass', isClass);
library_for_v2.set('IsClass', isClass);

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
library_for_v1.set('RegExHasKey', regexHasKey);
library_for_v2.set('RegExHasKey', regexHasKey);
library_for_v2.set('RegExHasOwnProp', regexHasKey);

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
library_for_v1.set('Contains', contains);
library_for_v1.set('Includes', contains);
library_for_v2.set('Contains', contains);
library_for_v2.set('Includes', contains);
// #endregion
