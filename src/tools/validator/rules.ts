import * as predicate from '../predicate';
import { ArrayValidatorRule, BooleanValidatorRule, NormalizeMap, Normalizer, NumberValidatorRule, ObjectValidatorRule, PropertyValidationMap, StringValidatorRule, ValidatorRule, ValidatorRuleBase } from '../../types/tools/validator/validators.types';
import { equals } from '../equiv';
import { DirectoryNotFoundError, ElementValidationError, FileNotFoundError, InvalidEnumValueError, LowerLimitError, PropertyAccessError, PropertyFoundNotError, PropertyValidationError, RangeError, UpperLimitError, ValidationError } from './error';
import { TypePredicate } from '../../types/tools/predicate.types';

export function optional<T, U extends ValidatorRuleBase<T>>(validatorRule: U, defaultValue?: T): U {
  return {
    ...validatorRule,
    optional: true,
    default: defaultValue,
  } as U;
}
function createBaseRule<R>(validator: TypePredicate<R>): ValidatorRuleBase<R> {
  let normalizeMap: NormalizeMap<R> | undefined;
  const rule: ValidatorRuleBase<R> = {
    default: undefined,
    optional: false,
    validator,
    __normalizer: async<V>(value: V): Promise<V | R> => {
      if (!normalizeMap) {
        return Promise.resolve(value);
      }

      switch (typeof value) {
        case 'undefined': return normalizeMap.undefined?.(value) as R ?? Promise.resolve(value as V);
        case 'string': return normalizeMap.string?.(value) as R ?? Promise.resolve(value as V);
        case 'number': return normalizeMap.number?.(value) as R ?? Promise.resolve(value as V);
        case 'boolean': return normalizeMap.boolean?.(value) as R ?? Promise.resolve(value as V);
        case 'object': {
          if (value === null) {
            return await normalizeMap.null?.(value) as V | R ?? Promise.resolve(value);
          }
          if (Array.isArray(value)) {
            return await normalizeMap.array?.(value) as V | R ?? Promise.resolve(value);
          }
          return await normalizeMap.object?.(value as Record<string, any>) as V | R ?? Promise.resolve(value);
        }
        default: {
          break;
        }
      }
      return await normalizeMap.any?.(value) as V | R ?? Promise.resolve(value);
    },
    normalize: (normalizerOrNormalizeMap: Normalizer<any, R> | NormalizeMap<R>): typeof rule => {
      normalizeMap = predicate.isCallable(normalizerOrNormalizeMap) ? { any: normalizerOrNormalizeMap } : normalizerOrNormalizeMap;
      return rule;
    },
  };
  return rule;
}
export function string(): StringValidatorRule {
  const ignoreCase = false;
  let enumStrings: string[] | undefined;

  const rule: StringValidatorRule = {
    ...createBaseRule((value: any): value is string => {
      if (!predicate.isString(value)) {
        return false;
      }
      if (enumStrings && !enumStrings.some((childValue) => equals(value, childValue, ignoreCase))) {
        throw new InvalidEnumValueError(value, enumStrings);
      }
      return true;
    }) as StringValidatorRule,
    enum: (...strings: string[]): typeof rule => {
      enumStrings = strings;
      return rule;
    },
  };
  return rule;
}
export function file(): StringValidatorRule {
  const baseRule = string();
  return {
    ...baseRule,
    validator: (value: any): value is string => {
      if (!predicate.isString(value)) {
        throw new ValidationError(value);
      }
      if (!predicate.fileExists(value)) {
        throw new FileNotFoundError(value);
      }
      return baseRule.validator(value);
    },
  };
}
export function directory(): StringValidatorRule {
  const baseRule = string();
  return {
    ...baseRule,
    validator: (value: any): value is string => {
      if (!predicate.isString(value)) {
        throw new ValidationError(value);
      }
      if (!predicate.fileExists(value)) {
        throw new DirectoryNotFoundError(value);
      }
      return baseRule.validator(value);
    },
  };
}
export function dir(): StringValidatorRule {
  return directory();
}
export function path(): StringValidatorRule {
  const fileRule = file();
  const dirRule = directory();
  return {
    ...fileRule,
    ...dirRule,
    validator: (value: any): value is string => {
      return fileRule.validator(value) || dirRule.validator(value);
    },
  };
}
export const number = (): NumberValidatorRule => {
  let limitMin: number | undefined;
  let limitMax: number | undefined;

  const rule: NumberValidatorRule = {
    ...createBaseRule((value: any): value is number => {
      if (!predicate.isNumber(value)) {
        return false;
      }
      if (predicate.isNumber(limitMin) && predicate.isNumber(limitMax)) {
        if (limitMin <= value && value <= limitMax) {
          return true;
        }
        throw new RangeError(value, limitMin, limitMax);
      }
      else if (predicate.isNumber(limitMin)) {
        if (limitMin <= value) {
          return true;
        }
        throw new LowerLimitError(value, limitMin);
      }
      else if (predicate.isNumber(limitMax)) {
        if (value <= limitMax) {
          return true;
        }
        throw new UpperLimitError(value, limitMax);
      }
      return true;
    }) as NumberValidatorRule,
    min: (number: number): typeof rule => {
      limitMin = number;
      return rule;
    },
    max: (number: number): typeof rule => {
      limitMax = number;
      return rule;
    },
    minmax: (min: number, max: number): typeof rule => {
      limitMin = min;
      limitMax = max;
      return rule;
    },
    positive: (): typeof rule => {
      limitMin = 1;
      return rule;
    },
    negative: (): typeof rule => {
      limitMax = -1;
      return rule;
    },
  };
  return rule;
};
export function boolean(): BooleanValidatorRule {
  return {
    ...createBaseRule((value: any): value is boolean => {
      if (predicate.isBoolean(value)) {
        return true;
      }
      return false;
    }) as BooleanValidatorRule,
  };
}
export function bool(): BooleanValidatorRule {
  return boolean();
}
export const object = <R extends Record<string, any>>(properties: PropertyValidationMap<R>): ObjectValidatorRule<R> => {
  const baseRule = createBaseRule((value: any): value is R => {
    if (!predicate.isObjectLiteral(value)) {
      throw new ValidationError(value);
    }

    const valueKeys = Object.entries(value).map(([ key ]) => key).sort();
    const propertyKeys = Object.entries(properties).map(([ key ]) => key).sort();

    // If the value is an empty object, an error is raised unless the defined property is also an empty object
    if (valueKeys.length === 0) {
      if (propertyKeys.length === 0) {
        return true;
      }
      throw new ValidationError(value);
    }

    // Check if the value has a defined property
    propertyKeys.forEach((key) => {
      if (valueKeys.includes(key)) {
        return;
      }
      throw new PropertyFoundNotError(value, key);
    });

    // Check each property
    for (const [ key, childValue ] of Object.entries(value)) {
      if (!(key in properties)) {
        throw new PropertyAccessError(value, key);
      }

      const property = properties[key as keyof R];
      if (!property.validator(childValue)) {
        throw new PropertyValidationError(childValue, key);
      }
    }
    return true;
  });
  return {
    ...(baseRule as ObjectValidatorRule<R>),
    __normalizer: async<V>(value: V): Promise<V | R> => {
      if (!predicate.isObjectLiteral(value)) {
        return value;
      }

      const normalized = {} as R;
      for await (const [ key, childValue ] of Object.entries(value)) {
        const property = properties[key as keyof R];
        normalized[key as keyof R] = await property.__normalizer(childValue) as R[keyof R];
      }
      return normalized;
    },
    properties,
  };
};
export const array = <R extends any[]>(element: ValidatorRule<R[number]>): ArrayValidatorRule<R> => {
  return {
    ...createBaseRule((value: any): value is R => {
      if (!Array.isArray(value)) {
        throw new ValidationError(value);
      }

      value.forEach((childValue, index) => {
        if (!predicate.isNumber(index)) {
          return;
        }
        if (!element.validator(childValue)) {
          throw new ElementValidationError(value, index);
        }
      });
      return true;
    }) as ArrayValidatorRule<R>,
    __normalizer: async<V>(value: V): Promise<R | V> => {
      if (!Array.isArray(value)) {
        return value;
      }

      const normalized = [] as unknown as R;
      for await (const childValue of value) {
        normalized.push(await element.__normalizer(childValue) as R[number]);
      }
      return normalized;
    },
    element,
  };
};
