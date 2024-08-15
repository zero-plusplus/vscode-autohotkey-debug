import { Predicate } from '../../types/tools/predicate.types';
import { ErrorHandle, ErrorHandleMap, Normalizer, Validator } from '../../types/tools/validator/common.types';
import * as predicate from '../predicate';
import { ValidationError } from './error';

export function createValidator<T>(validator: Predicate, normalizers: Array<Normalizer<any, T | Promise<T>>>): Validator<T>;
export function createValidator<T>(validator: Predicate, validatedErrorHandle: ErrorHandle, normalizers: Array<Normalizer<any, T | Promise<T>>>): Validator<T>;
export function createValidator<T>(arg1: Predicate, arg2: ErrorHandle | Array<Normalizer<any, T | Promise<T>>>, arg3?: Array<Normalizer<any, T | Promise<T>>>): Validator<T> {
  const validator = arg1;
  const errorHandler = Array.isArray(arg2)
    ? ((value: T): void => {
      throw new ValidationError(value, '');
    })
    : arg2;
  const normalizers = Array.isArray(arg2) ? arg2 : arg3!;

  return async(value: any) => {
    for await (const normalizer of normalizers) {
      let normalized: Awaited<ReturnType<typeof normalizer>> | undefined;
      try {
        normalized = await normalizer(value);
        if (validator(normalized)) {
          return normalized;
        }
        handleError(errorHandler, normalized);
      }
      catch (e: unknown) {
        if (e instanceof ValidationError) {
          continue;
        }
      }
    }
    throw new ValidationError(value, '');
  };

  async function handleError(handler: ErrorHandle | ErrorHandleMap, value: any): Promise<void> {
    if (predicate.isCallable(handler)) {
      await handler(value);
      return;
    }

    if (!predicate.isObjectLiteral(value)) {
      throw Error('Internal message: Error handling for objects defined for primitive values.');
    }

    for await (const [ key, childValue ] of Object.entries(value)) {
      const predicateOrErrorHandler = handler[key];
      if (predicate.isCallable(predicateOrErrorHandler)) {
        await predicateOrErrorHandler(childValue);
        continue;
      }
      await handleError(predicateOrErrorHandler, childValue);
    }
  }
}

export function expect<V, R>(predicate: ((value: any) => value is V), normalizer: Normalizer<V, R>): Validator<R> {
  return async(value: any): Promise<R> => {
    if (predicate(value)) {
      return Promise.resolve(normalizer(value));
    }
    throw new ValidationError(value, '');
  };
}
export function expectAny<R>(normalizer: Normalizer<any, R>): Validator<R> {
  return async(value: any) => expect(predicate.isAny, normalizer)(value);
}
export function expectUndefined<R>(normalizer: Normalizer<undefined, R>): Validator<R> {
  return async(value: any) => expect(predicate.isUndefined, normalizer)(value);
}
export function expectString<R>(normalizer: Normalizer<string, R>): Validator<R> {
  return async(value: any) => expect(predicate.isString, normalizer)(value);
}
export function expectNumber<R>(normalizer: Normalizer<number, R>): Validator<R> {
  return async(value: any) => expect(predicate.isNumber, normalizer)(value);
}
export function expectBoolean<R>(normalizer: Normalizer<boolean, R>): Validator<R> {
  return async(value: any) => expect(predicate.isBoolean, normalizer)(value);
}
export function expectObjectLiteral<R>(normalizer: Normalizer<object, R>): Validator<R> {
  return async(value: any) => expect(predicate.isObjectLiteral, normalizer)(value);
}
export function expectArrayLiteral<T, R>(normalizer: Normalizer<T[], R>): Validator<R> {
  return async(value: any) => expect(predicate.isArrayLiteral, normalizer)(value);
}
export function expectStringArray<R>(normalizer: Normalizer<string[], R>): Validator<R> {
  return async(value: any) => expect(predicate.isStringArray, normalizer)(value);
}
export function expectNumberArray<R>(normalizer: Normalizer<number[], R> = (value: any) => value as R): Validator<R> {
  return async(value: any) => expect(predicate.isNumberArray, normalizer)(value);
}
