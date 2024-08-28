import { statSync } from 'fs';
import { InterfaceRule, Predicate } from '../types/tools/predicate.types';

export function strictly(predicate: Predicate, error: Error) {
  return (value: any): ReturnType<typeof predicate> => {
    if (predicate(value)) {
      return true;
    }
    throw error;
  };
}
export function directoryExists(value: any): boolean {
  if (!isString(value)) {
    return false;
  }

  try {
    return statSync(value).isDirectory();
  }
  catch {
  }
  return false;
}
export function fileExists(value: any): boolean {
  if (!isString(value)) {
    return false;
  }

  try {
    return statSync(value).isFile();
  }
  catch {
  }
  return false;
}
/**
 * https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
 */
export function isValidWindowsFileName(value: any): value is string {
  if (!isString(value)) {
    return false;
  }
  return (/^[^<>:"/\\|?*]+$/u).test(value);
}
export function isAny(value: any): value is any {
  return true;
}
export function isUndefined(value: any): value is undefined {
  return typeof value === 'undefined';
}
export function isString(value: any): value is string {
  return typeof value === 'string';
}
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}
export function isNumberLike(value: any): boolean {
  if (value === '') {
    return false;
  }
  const converted = Number(value);
  if (isNaN(converted)) {
    return false;
  }
  return true;
}
export function isFloat(value: any): boolean {
  const num = Number(value);
  return !Number.isInteger(num) && Number.isFinite(num);
}
export function isPositiveNumber(value: any): value is number {
  return isNumber(value) && 0 < value;
}
export function isNegativeNumber(value: any): value is number {
  return isNumber(value) && value < 0;
}
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}
export function isObject<T extends object = object>(value: any, interfaceRules?: InterfaceRule): value is T {
  if (typeof value !== 'object') {
    return false;
  }
  if (!interfaceRules) {
    return true;
  }

  for (const [ key, childValue ] of Object.entries(value as object)) {
    const predicateOrInterfaceRules = interfaceRules[key];
    const result = isCallable(predicateOrInterfaceRules)
      ? predicateOrInterfaceRules(childValue)
      : isObject(childValue, predicateOrInterfaceRules);
    if (!result) {
      return false;
    }
  }
  return true;
}
export function isObjectLiteral(value: any): value is object {
  return isObject(value) && Object.prototype.toString.call(value) === '[object Object]';
}
export function isArray<T = any>(value: any, predicate: Predicate = ((value: any): value is T => true)): value is T[] {
  return Array.isArray(value) && value.every((childValue) => predicate(childValue));
}
export function isArrayLiteral<T = any>(value: any): value is T[] {
  return Array.isArray(value) && Object.prototype.toString.call(value) === '[object Array]';
}
export function isStringArray(value: any): value is string[] {
  return isArray(value, isString);
}
export function isNumberArray(value: any): value is number[] {
  return isArray(value, isNumber);
}
export function isCallable(value: any): value is Function {
  return typeof value === 'function';
}
