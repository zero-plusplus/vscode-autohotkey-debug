import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { EvaluatedValue, fetchProperty, fetchPropertyChildren } from './ExpressionEvaluator';

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
    case 'string': return isNumber(session, stackFrame, Number(value));
    case 'number': return Promise.resolve(true);
    default: break;
  }
  return Promise.resolve(false);
};
library_for_v1.set('IsNumberLike', isNumberLike);
library_for_v2.set('IsNumberLike', isNumberLike);
