import * as predicate from '../predicate';
import { AlternativeValidatorRule, ArrayValidatorRule, BooleanValidatorRule, LiteralSubRules, NormalizeMap, Normalizer, NumberSubRules, NumberValidatorRule, ObjectValidatorRule, OptionalValidatorRule, PickResultByMap, PickResultByRule, PickResultByRules, PickResultsByRule, TemplateValidatorRule, TupleValidatorRule, UnionValidatorRule, ValidatorRule } from '../../types/tools/validator';
import { DirectoryNotFoundError, ElementValidationError, FileNotFoundError, LowerLimitError, PropertyAccessError, PropertyFoundNotError, PropertyValidationError, RangeError, UpperLimitError, ValidationError } from './error';
import { TypePredicate } from '../../types/tools/predicate.types';

export function custom<R>(validator: TypePredicate<R>): ValidatorRule<R> {
  let normalizeMap: NormalizeMap<R> | undefined;

  const rule: ValidatorRule<R> = {
    __optional: false,
    optional: () => optional(rule),
    default: (defaultValue: R | Normalizer<undefined, R>): typeof rule => {
      const undefinedCallback = predicate.isCallable(defaultValue) ? defaultValue : (): R => defaultValue;
      normalizeMap = normalizeMap ? { ...normalizeMap, undefined: undefinedCallback } : { undefined: undefinedCallback };
      return rule;
    },
    validator: (value: any): value is R => {
      if (rule.__optional && value === undefined) {
        return true;
      }
      return validator(value);
    },
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

export function optional<Rule extends ValidatorRule<any>>(validatorRule: Rule): OptionalValidatorRule<Rule> {
  validatorRule.__optional = true;
  return validatorRule as OptionalValidatorRule<Rule>;
}
export function alternative<Rules extends Array<ValidatorRule<any>>>(...validatorRules: Rules): AlternativeValidatorRule<Rules> {
  const alternativeRules = validatorRules.map((rule) => ({ ...rule, optional: false }));
  const rule = custom((value: any): value is PickResultByRules<Rules> => {
    const result = alternativeRules.some((rule) => {
      try {
        return rule.validator(value);
      }
      catch {
      }
      return false;
    });

    if (result) {
      return true;
    }
    throw new ValidationError(value);
  }) as AlternativeValidatorRule<Rules>;
  return rule;
}
export function string(): ValidatorRule<string> & LiteralSubRules<string> {
  const rule: ValidatorRule<string> & LiteralSubRules<string> = {
    ...custom((value: any): value is string => {
      if (predicate.isString(value)) {
        return true;
      }
      throw new ValidationError(value);
    }),
    union: <Args extends string[]>(...values: Args): ValidatorRule<Args[number]> => {
      return union(...values);
    },
  } as ValidatorRule<string> & LiteralSubRules<string>;
  return rule;
}
export function file(): ValidatorRule<string> {
  const rule: ValidatorRule<string> = custom((value: any): value is string => {
    if (!predicate.isString(value)) {
      throw new ValidationError(value);
    }
    if (!predicate.fileExists(value)) {
      throw new FileNotFoundError(value);
    }
    return true;
  });
  return rule;
}
export function directory(): ValidatorRule<string> {
  const rule: ValidatorRule<string> = custom((value: any): value is string => {
    if (!predicate.isString(value)) {
      throw new ValidationError(value);
    }
    if (!predicate.directoryExists(value)) {
      throw new DirectoryNotFoundError(value);
    }
    return true;
  });
  return rule;
}
export function dir(): ValidatorRule<string> {
  return directory();
}
export function path(): ValidatorRule<string> {
  return alternative(file(), directory());
}
export function number(): ValidatorRule<number> & NumberSubRules {
  let limitMin: number | undefined;
  let limitMax: number | undefined;

  const rule: ValidatorRule<number> & NumberSubRules = {
    ...custom((value: any): value is number => {
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
  } as ValidatorRule<number> & NumberSubRules;
  return rule;
}
export function boolean(): ValidatorRule<boolean> {
  const rule: ValidatorRule<boolean> = custom((value: any): value is boolean => {
    if (predicate.isBoolean(value)) {
      return true;
    }
    return false;
  });
  return rule;
}
export function bool(): BooleanValidatorRule {
  return boolean();
}
export function object<RuleMap extends Record<string, ValidatorRule<any>>>(properties: RuleMap): ObjectValidatorRule<RuleMap> {
  const rule: ObjectValidatorRule<RuleMap> = {
    ...custom((value: any): value is PickResultByMap<RuleMap> => {
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
        const property = properties[key];
        if (property.__optional) {
          return;
        }
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

        const property = properties[key];
        if (!property.validator(childValue)) {
          throw new PropertyValidationError(childValue, key);
        }
      }
      return true;
    }) as ObjectValidatorRule<RuleMap>,
    __normalizer: async<V>(value: V): Promise<PickResultByMap<RuleMap> | V> => {
      if (!predicate.isObjectLiteral(value)) {
        return value;
      }

      const normalized = {} as PickResultByMap<RuleMap>;
      for await (const [ key, childValue ] of Object.entries(value)) {
        const property = properties[key];
        normalized[key as keyof PickResultByMap<RuleMap>] = await property.__normalizer(childValue) as PickResultByMap<RuleMap>[typeof key];
      }
      return normalized;
    },
    properties,
  };
  return rule;
}
export function array<Rule extends ValidatorRule<any>>(element: Rule): ArrayValidatorRule<Rule> {
  const rule: ArrayValidatorRule<Rule> = {
    ...custom((value: any): value is PickResultsByRule<Rule> => {
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
    }) as ArrayValidatorRule<Rule>,
    __normalizer: async<V>(value: V): Promise<Array<PickResultByRule<Rule>> | V> => {
      if (!Array.isArray(value)) {
        return value;
      }

      const normalized: Array<PickResultByRule<Rule>> = [];
      for await (const childValue of value) {
        normalized.push(await element.__normalizer(childValue) as PickResultByRule<Rule>);
      }
      return normalized;
    },
    element,
  };
  return rule;
}
export function union<R, Args extends any[] = any[]>(...values: Args): UnionValidatorRule<R> {
  return custom((value: any): value is R => {
    return values.some((_value) => value === _value);
  });
}
export function tuple<Args extends any[]>(...values: Args): TupleValidatorRule<Args> {
  return custom((value: any): value is Args[number] => {
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length !== values.length) {
      return false;
    }
    return value.every((element, index) => {
      return element === values[index];
    });
  });
}
export const template = {
  object: <R extends Record<string, any>>(properties: { [key in keyof R]: ValidatorRule<R[key]> }): TemplateValidatorRule<R> => {
    return object(properties) as TemplateValidatorRule<R>;
  },
  union<R>(...args: R[]): TupleValidatorRule<R> {
    return union(...args);
  },
  tuple<R extends any[]>(...args: R): TupleValidatorRule<R> {
    return tuple(...args);
  },
};
