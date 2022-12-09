import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { EvaluatedValue, fetchProperty, fetchPropertyChildren } from './ExpressionEvaluator';

const toNumber = (value: any): number | undefined => {
  const number = Number(value);
  if (isNaN(number)) {
    return undefined;
  }
  return number;
};

export type LibraryFunc = (session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, ...params: EvaluatedValue[]) => Promise<string | number | boolean | undefined>;
export type LibraryFuncReturnValue = string | number | boolean | undefined;

export const library_for_v1 = new CaseInsensitiveMap<string, LibraryFunc>();
export const library_for_v2 = new CaseInsensitiveMap<string, LibraryFunc>();

const instanceOf: LibraryFunc = async(session, stackFrame, object, superClass): Promise<boolean> => {
  if (!(object instanceof dbgp.ObjectProperty)) {
    return false;
  }
  if (!(superClass instanceof dbgp.ObjectProperty)) {
    return false;
  }

  const baseClass = await fetchProperty(session, `${object.fullName}.base`, stackFrame);
  if (!(baseClass instanceof dbgp.ObjectProperty)) {
    return false;
  }

  if (baseClass.address === superClass.address) {
    return true;
  }

  return Boolean(instanceOf(session, stackFrame, baseClass, superClass));
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
  return Promise.resolve(typeof value === 'undefined');
};
library_for_v1.set('IsSet', isSet);
library_for_v2.set('IsSet', isSet);
library_for_v1.set('IsUndefined', isSet);
library_for_v2.set('IsUndefined', isSet);

const isString: LibraryFunc = async(session, stackFrame, value) => {
  return Promise.resolve(typeof value === 'string');
};
library_for_v1.set('IsString', isString);
library_for_v2.set('IsString', isString);

const isNumber: LibraryFunc = async(session, stackFrame, value) => {
  return Promise.resolve(typeof value === 'number');
};
library_for_v1.set('IsNumber', isNumber);
library_for_v2.set('IsNumber', isNumber);

const isNumberLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isNumber(session, stackFrame, toNumber(value));
    case 'number': return Promise.resolve(true);
    default: break;
  }
  return Promise.resolve(false);
};
library_for_v1.set('IsNumberLike', isNumberLike);
library_for_v2.set('IsNumberLike', isNumberLike);

const isInteger: LibraryFunc = async(session, stackFrame, value) => {
  if (!(await isNumber(session, stackFrame, value))) {
    return false;
  }
  return Promise.resolve(Number.isInteger(value));
};
library_for_v1.set('IsInteger', isInteger);
library_for_v2.set('IsInteger', isInteger);

const isIntegerLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isInteger(session, stackFrame, toNumber(value));
    case 'number': return isInteger(session, stackFrame, value);
    default: break;
  }
  return Promise.resolve(false);
};
library_for_v1.set('IsIntegerLike', isIntegerLike);
library_for_v2.set('IsIntegerLike', isIntegerLike);

const isFloat: LibraryFunc = async(session, stackFrame, value) => {
  if (!(await isNumber(session, stackFrame, value))) {
    return false;
  }
  return Promise.resolve(typeof value === 'number' && (value % 1 !== 0));
};
library_for_v1.set('IsFloat', isFloat);
library_for_v2.set('IsFloat', isFloat);

const isFloatLike: LibraryFunc = async(session, stackFrame, value) => {
  switch (typeof value) {
    case 'string': return isFloat(session, stackFrame, toNumber(value));
    case 'number': return isFloat(session, stackFrame, value);
    default: break;
  }
  return Promise.resolve(false);
};
library_for_v1.set('IsFloatLike', isFloatLike);
library_for_v2.set('IsFloatLike', isFloatLike);

const isPrimitive: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value === 'undefined') {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
};
library_for_v1.set('IsPrimitive', isPrimitive);
library_for_v2.set('IsPrimitive', isPrimitive);

const isObject: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty) {
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
};
library_for_v1.set('IsObject', isObject);
library_for_v2.set('IsObject', isObject);

const isAlpha: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return Promise.resolve(false);
  }
  return Promise.resolve((/^[a-zA-Z]+$/u).test(value));
};
library_for_v1.set('IsAlpha', isAlpha);
library_for_v2.set('IsAlpha', isAlpha);

const isAlnum: LibraryFunc = async(session, stackFrame, value) => {
  if (value instanceof dbgp.ObjectProperty || typeof value !== 'string') {
    return Promise.resolve(false);
  }
  return Promise.resolve((/^[a-zA-Z0-9]+$/u).test(value));
};
library_for_v1.set('IsAlnum', isAlnum);
library_for_v2.set('IsAlnum', isAlnum);
