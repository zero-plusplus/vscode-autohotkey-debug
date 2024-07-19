import * as predicate from '../predicate';
import { AlternativeValidatorRule, ArrayValidatorRule, BooleanValidatorRule, NormalizeMap, Normalizer, NumberValidatorRule, ObjectValidatorRule, OptionalValidatorRule, PickResultByMap, PickResultByRule, PickResultByRules, PickResultsByRule, StringValidatorRule, TemplateValidatorRule, TupleValidatorRule, UnionValidatorRule, ValidatorRuleBase } from '../../types/tools/validator';
import { equals } from '../equiv';
import { DirectoryNotFoundError, ElementValidationError, FileNotFoundError, InvalidEnumValueError, LowerLimitError, PropertyAccessError, PropertyFoundNotError, PropertyValidationError, RangeError, UpperLimitError, ValidationError } from './error';
import { TypePredicate } from '../../types/tools/predicate.types';

export function custom<R>(validator: TypePredicate<R>): ValidatorRuleBase<R> {
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

export function optional<Rule extends ValidatorRuleBase<any>>(validatorRule: Rule): OptionalValidatorRule<Rule> {
  return {
    ...validatorRule,
    optional: true,
  } as OptionalValidatorRule<Rule>;
}
export function alternative<Rules extends Array<ValidatorRuleBase<any>>>(...validatorRules: Rules): AlternativeValidatorRule<Rules> {
  const alternativeRules = validatorRules.map((rule) => ({ ...rule, optional: false }));
  const rule = custom((value: any): value is PickResultByRules<Rules> => {
    if (rule.optional) {
      return true;
    }

    return alternativeRules.some((rule) => rule.validator(value));
  }) as AlternativeValidatorRule<Rules>;
  return rule;
}
export function string(): StringValidatorRule {
  const ignoreCase = false;
  let enumStrings: string[] | undefined;

  const rule: StringValidatorRule = {
    ...custom((value: any): value is string => {
      if (rule.optional && value === undefined) {
        return true;
      }

      if (!predicate.isString(value)) {
        return false;
      }
      if (enumStrings && !enumStrings.some((childValue) => equals(value, childValue, ignoreCase))) {
        throw new InvalidEnumValueError(value, enumStrings);
      }
      return true;
    }) as StringValidatorRule,
    union: <Args extends string[]>(...strings: Args): UnionValidatorRule<Args[number]> => {
      return union(...strings);
    },
  };
  return rule;
}
export function file(): StringValidatorRule {
  const baseRule = string();
  const rule: StringValidatorRule = {
    ...baseRule,
    validator: (value: any): value is string => {
      if (rule.optional && value === undefined) {
        return true;
      }

      if (!predicate.isString(value)) {
        throw new ValidationError(value);
      }
      if (!predicate.fileExists(value)) {
        throw new FileNotFoundError(value);
      }
      return baseRule.validator(value);
    },
  };
  return rule;
}
export function directory(): StringValidatorRule {
  const baseRule = string();
  const rule: StringValidatorRule = {
    ...baseRule,
    validator: (value: any): value is string => {
      if (rule.optional && value === undefined) {
        return true;
      }

      if (!predicate.isString(value)) {
        throw new ValidationError(value);
      }
      if (!predicate.fileExists(value)) {
        throw new DirectoryNotFoundError(value);
      }
      return baseRule.validator(value);
    },
  };
  return rule;
}
export function dir(): StringValidatorRule {
  return directory();
}
export function path(): StringValidatorRule {
  const fileRule = file();
  const dirRule = directory();

  const rule: StringValidatorRule = {
    ...fileRule,
    ...dirRule,
    validator: (value: any): value is string => {
      return fileRule.validator(value) || dirRule.validator(value);
    },
  };
  return rule;
}
export function number(): NumberValidatorRule {
  let limitMin: number | undefined;
  let limitMax: number | undefined;

  const rule: NumberValidatorRule = {
    ...custom((value: any): value is number => {
      if (rule.optional && value === undefined) {
        return true;
      }

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
}
export function boolean(): BooleanValidatorRule {
  const rule: BooleanValidatorRule = {
    ...custom((value: any): value is boolean => {
      if (rule.optional && value === undefined) {
        return true;
      }

      if (predicate.isBoolean(value)) {
        return true;
      }
      return false;
    }) as BooleanValidatorRule,
  };
  return rule;
}
export function bool(): BooleanValidatorRule {
  return boolean();
}
export function object<RuleMap extends Record<string, ValidatorRuleBase<any>>>(properties: RuleMap): ObjectValidatorRule<RuleMap> {
  const rule: ObjectValidatorRule<RuleMap> = {
    ...custom((value: any): value is PickResultByMap<RuleMap> => {
      if (rule.optional && value === undefined) {
        return true;
      }

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
        if (property.optional) {
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
export function array<Rule extends ValidatorRuleBase<any>>(element: Rule): ArrayValidatorRule<Rule> {
  const rule: ArrayValidatorRule<Rule> = {
    ...custom((value: any): value is PickResultsByRule<Rule> => {
      if (rule.optional && value === undefined) {
        return true;
      }

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
