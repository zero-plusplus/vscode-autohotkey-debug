import * as predicate from '../predicate';
import { InterfaceToRuleMap, LiteralValidatorUtils, NormalizeMap, Normalizer, NumberValidatorUtils, RuleMap, RuleMapToInterface, RuleToNormalized, Rules, RulesToTuple, RulesToUnion, UnionToRules, ValidatorRule } from '../../types/tools/validator';
import { DirectoryNotFoundError, ElementValidationError, FileNotFoundError, LowerLimitError, PropertyAccessError, PropertyFoundNotError, PropertyValidationError, RangeError, UpperLimitError, ValidationError } from './error';
import { TypePredicate } from '../../types/tools/predicate.types';
import { IsAny, JsonPrimitive } from 'type-fest/';

export function custom<Normalized>(validator: TypePredicate<Normalized>): ValidatorRule<Normalized> {
  let normalizeMap: NormalizeMap<Normalized> | undefined;

  const rule: ValidatorRule<Normalized> = {
    __optional: false,
    optional: () => optional(rule),
    default: (defaultValue: Normalized | Normalizer<undefined, Normalized>): typeof rule => {
      const undefinedCallback = predicate.isCallable(defaultValue) ? defaultValue : (): Normalized => defaultValue;
      normalizeMap = normalizeMap ? { ...normalizeMap, undefined: undefinedCallback } : { undefined: undefinedCallback };
      return rule;
    },
    validator: (value: any): value is Normalized => {
      if (rule.__optional && value === undefined) {
        return true;
      }
      return validator(value);
    },
    __normalizer: async<V>(value: V): Promise<V | Normalized> => {
      if (!normalizeMap) {
        return Promise.resolve(value);
      }

      switch (typeof value) {
        case 'undefined': return normalizeMap.undefined?.(value) as Normalized ?? Promise.resolve(value as V);
        case 'string': return normalizeMap.string?.(value) as Normalized ?? Promise.resolve(value as V);
        case 'number': return normalizeMap.number?.(value) as Normalized ?? Promise.resolve(value as V);
        case 'boolean': return normalizeMap.boolean?.(value) as Normalized ?? Promise.resolve(value as V);
        case 'object': {
          if (value === null) {
            return await normalizeMap.null?.(value) as V | Normalized ?? Promise.resolve(value);
          }
          if (Array.isArray(value)) {
            return await normalizeMap.array?.(value) as V | Normalized ?? Promise.resolve(value);
          }
          return await normalizeMap.object?.(value as Record<string, any>) as V | Normalized ?? Promise.resolve(value);
        }
        default: {
          break;
        }
      }
      return await normalizeMap.any?.(value) as V | Normalized ?? Promise.resolve(value);
    },
    normalize: (normalizerOrNormalizeMap: Normalizer<any, Normalized> | NormalizeMap<Normalized>): typeof rule => {
      normalizeMap = predicate.isCallable(normalizerOrNormalizeMap) ? { any: normalizerOrNormalizeMap } : normalizerOrNormalizeMap;
      return rule;
    },
  };
  return rule;
}

// #region combinator rules
export function optional<
  Normalized extends RuleToNormalized<Rule>,
  Rule extends ValidatorRule<any> = ValidatorRule<Normalized>,
>(validatorRule: Rule): ValidatorRule<RuleToNormalized<Rule> | undefined> {
  return {
    ...validatorRule,
    __optional: true,
  } as ValidatorRule<RuleToNormalized<Rule> | undefined>;
}
export function alternative<
  Normalized extends RulesToUnion<Args>,
  Args extends Rules = UnionToRules<Normalized>,
>(...validatorRules: Args): ValidatorRule<IsAny<Normalized> extends true ? RulesToUnion<Args> : Normalized> {
  const alternativeRules = validatorRules.map((rule) => ({ ...rule, optional: false }));
  const rule = custom((value: any): value is Normalized => {
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
  });
  return rule;
}
export function alt<
  Normalized extends RulesToUnion<Args>,
  Args extends Rules = UnionToRules<Normalized>,
>(...validatorRules: Args): ValidatorRule<IsAny<Normalized> extends true ? RulesToUnion<Args> : Normalized> {
  return alternative(...validatorRules);
}
// #endregion combinator rules

// #region literal rules
export function literal<
  Normalized extends JsonPrimitive | true | false,
  Args extends Normalized[] = Normalized[],
>(...literalUnion: Args): ValidatorRule<Args[number]> {
  const rule: ValidatorRule<Args[number]> = {
    ...custom((value: any): value is Normalized => {
      if (literalUnion.some((literal) => value === literal)) {
        return true;
      }
      throw new ValidationError(value);
    }),
  };
  return rule;
}
export function string(): ValidatorRule<string> & LiteralValidatorUtils<string> {
  const rule: ValidatorRule<string> & LiteralValidatorUtils<string> = {
    ...custom((value: any): value is string => {
      if (predicate.isString(value)) {
        return true;
      }
      throw new ValidationError(value);
    }),
    union: <Normalized extends string, Args extends Normalized[] = Normalized[]>(...values: Args): ValidatorRule<Args[number]> => {
      return literal(...values);
    },
  } as ValidatorRule<string> & LiteralValidatorUtils<string>;
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
export function number(): ValidatorRule<number> & NumberValidatorUtils {
  let limitMin: number | undefined;
  let limitMax: number | undefined;

  const rule: ValidatorRule<number> & NumberValidatorUtils = {
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
    }),
    union: <Normalized extends number, Args extends Normalized[] = Normalized[]>(...values: Args): ValidatorRule<Args[number]> => {
      const rules = values.map(() => number());
      return alternative(...rules) as ValidatorRule<Args[number]>;
    },
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
  } as ValidatorRule<number> & NumberValidatorUtils;
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
export function bool(): ValidatorRule<boolean> {
  return boolean();
}
// #endregion literal rules

// #region object rules
export function object<
  Normalized extends RuleMapToInterface<Args>,
  Args extends RuleMap = InterfaceToRuleMap<Normalized>,
>(ruleMap: Args): ValidatorRule<Normalized> {
  const rule: ValidatorRule<Normalized> = {
    ...custom((value: any): value is Normalized => {
      if (!predicate.isObjectLiteral(value)) {
        throw new ValidationError(value);
      }

      const valueKeys = Object.entries(value).map(([ key ]) => key).sort();
      const propertyKeys = Object.entries(ruleMap).map(([ key ]) => key).sort();

      // If the value is an empty object, an error is raised unless the defined property is also an empty object
      if (valueKeys.length === 0) {
        if (propertyKeys.length === 0) {
          return true;
        }
        throw new ValidationError(value);
      }

      // Check if the value has a defined property
      propertyKeys.forEach((key) => {
        const property = ruleMap[key];
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
        if (!(key in ruleMap)) {
          throw new PropertyAccessError(value, key);
        }

        const property = ruleMap[key];
        if (!property.validator(childValue)) {
          throw new PropertyValidationError(childValue, key);
        }
      }
      return true;
    }),
    __normalizer: async<V>(value: V): Promise<Normalized | V> => {
      if (!predicate.isObjectLiteral(value)) {
        return value;
      }

      const normalized = {};
      for await (const [ key, childValue ] of Object.entries(value)) {
        const rule = ruleMap[key];
        normalized[key] = await rule.__normalizer(childValue) as Normalized[keyof Normalized];
      }
      return normalized as Normalized;
    },
  };
  return rule;
}
export function array<
  Normalized extends RuleToNormalized<Arg>,
  Arg extends ValidatorRule<any> = ValidatorRule<Normalized>,
>(element: Arg): ValidatorRule<Normalized[]> {
  const rule: ValidatorRule<Normalized[]> = {
    ...custom((value: any): value is Normalized[] => {
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
    }),
    __normalizer: async<V>(value: V): Promise<Normalized[] | V> => {
      if (!Array.isArray(value)) {
        return value;
      }

      const normalized: Normalized[] = [];
      for await (const childValue of value) {
        normalized.push(await element.__normalizer(childValue) as Normalized);
      }
      return normalized;
    },
  };
  return rule;
}
export function tuple<
  Normalized extends RulesToTuple<Args>,
  Args extends Array<ValidatorRule<any>> = Array<ValidatorRule<Normalized>>,
>(...rules: Args): ValidatorRule<IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized> {
  return custom((value: any): value is IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized => {
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length !== rules.length) {
      return false;
    }
    return value.every((element, index) => {
      const rule = rules.at(index);
      if (!rule) {
        return false;
      }
      return rule.validator(element);
    });
  });
}
// #endregion object rules
