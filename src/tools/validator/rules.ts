import * as predicate from '../predicate';
import { AttributeNormalizer, AttributeNormalizersByType, AttributeRule, AttributeRuleConfig, Interface, InterfaceToRuleMap, LiteralAttributeRule, LiteralType, NumberAttributeRule, ObjectAttributeRule, PropertyNormalizers, RuleMap, RuleMapToInterface, RuleToNormalized, Rules, RulesToTuple, RulesToUnion, SchemaAccessor, StringAttributeRule, UnionToRules } from '../../types/tools/validator';
import { DirectoryNotFoundError, ElementValidationError, FileNotFoundError, LowerLimitError, PropertyAccessError, PropertyFoundNotError, PropertyValidationError, RangeError, UpperLimitError, ValidationError } from './error';
import { IsAny, JsonValue, SetRequired } from 'type-fest/';

export function custom<Normalized>(validatorOrCustomConfig: CustomConfig<Normalized>['validator'] | CustomConfig<Normalized>): AttributeRule<Normalized> {
  const customConfig: CustomConfig<Normalized> = predicate.isCallable(validatorOrCustomConfig) ? { validator: validatorOrCustomConfig } : validatorOrCustomConfig;
  const config: AttributeRule<Normalized>['config'] = {
    normalizeMap: {},
    optional: false,
    normalizer: async<V>(value: V): Promise<Normalized | V> => {
      if (!config.normalizeMap) {
        return Promise.resolve(value);
      }
      const normalizer = getNormalizer(config.normalizeMap, value);
      if (!normalizer) {
        return Promise.resolve(value);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return normalizer(config.normalizeMap, value as any);
    },
    expected: 'any',
    ...customConfig,
    validator: (value: any): value is Normalized => {
      if (config.optional && value === undefined) {
        return true;
      }
      return customConfig.validator(value);
    },
  };

  const rule: AttributeRule<Normalized> = {
    get config() {
      return config;
    },
    optional: () => optional(rule),
    default: (defaultValue: Normalized | AttributeNormalizer<undefined, Normalized>): typeof rule => {
      const undefinedCallback = predicate.isCallable(defaultValue) ? defaultValue : (): Normalized => defaultValue;
      config.normalizeMap = config.normalizeMap ? { ...config.normalizeMap, undefined: undefinedCallback } : { undefined: undefinedCallback };
      return rule;
    },
    normalize: (normalizerOrNormalizeMap: AttributeNormalizer<any, Normalized> | AttributeNormalizersByType<Normalized>): typeof rule => {
      config.normalizeMap = predicate.isCallable(normalizerOrNormalizeMap) ? { any: normalizerOrNormalizeMap } : normalizerOrNormalizeMap;
      return rule;
    },
  };
  return rule;
}

// #region combinator rules
export function optional<
  Normalized extends RuleToNormalized<Rule>,
  Rule extends AttributeRule<any> = AttributeRule<Normalized>,
>(validatorRule: Rule): AttributeRule<RuleToNormalized<Rule> | undefined> {
  return custom({ ...validatorRule.config, optional: true, expected: `${validatorRule.config.expected} | undefined` }) as AttributeRule<RuleToNormalized<Rule> | undefined>;
}

export function alternative<
  Normalized extends RulesToUnion<Args>,
  Args extends Rules = UnionToRules<Normalized>,
>(...validatorRules: Args): AttributeRule<IsAny<Normalized> extends true ? RulesToUnion<Args> : Normalized> {
  const alternativeRules = validatorRules.map((rule) => ({ ...rule, config: { ...rule.config, optional: false } }));
  const rule: AttributeRule<Normalized> = custom({
    expected: alternativeRules.map((rule) => rule.config.expected).join(' | '),
    validator: (value: any): value is Normalized => {
      const result = alternativeRules.some((rule) => {
        try {
          return rule.config.validator(value);
        }
        catch {
        }
        return false;
      });

      if (result) {
        return true;
      }
      throw new ValidationError(value, rule.config.expected);
    },
  });
  return rule;
}
export function alt<
  Normalized extends RulesToUnion<Args>,
  Args extends Rules = UnionToRules<Normalized>,
>(...validatorRules: Args): AttributeRule<Normalized> {
  return alternative(...validatorRules);
}
export function literalUnion<
  Normalized extends Args[number],
  Args extends JsonValue[] = Normalized[],
>(...literals: Args): AttributeRule<Args[number]> {
  const rule = custom({
    expected: literals.map((literal) => JSON.stringify(literal)).join(' | '),
    validator: (value: any): value is Args[number] => {
      if (literals.some((literal) => literal === value)) {
        return true;
      }
      throw new ValidationError(value, rule.config.expected);
    },
  });
  return rule;
}
// #endregion combinator rules

// #region literal rules
export function literal<
  Type extends Args[number],
  Args extends LiteralType[] = Type[],
  Normalized extends LiteralType = IsAny<Type> extends true ? Type : Args[number],
>(): LiteralAttributeRule<Normalized> {
  const rule: LiteralAttributeRule<Normalized> = {
    ...custom({
      expected: `string | number | boolean`,
      validator: (value: any): value is Normalized => {
        return predicate.isString(value) || predicate.isNumber(value) || predicate.isBoolean(value);
      },
    }) as LiteralAttributeRule<Normalized>,
    union: <
      Normalized extends Args[number],
      Args extends JsonValue[] = Normalized[],
    >(...literals: Args): AttributeRule<Args[number]> => {
      return literalUnion(...literals);
    },
  };
  return rule;
}
export function string(): StringAttributeRule {
  const rule: StringAttributeRule = {
    ...custom({
      expected: 'string',
      validator: (value: any): value is string => {
        if (predicate.isString(value)) {
          return true;
        }
        throw new ValidationError(value, rule.config.expected);
      },
    }) as StringAttributeRule,
    union: <
      Normalized extends Args[number],
      Args extends string[] = Normalized[],
    >(...literals: Args): AttributeRule<Args[number]> => {
      return literalUnion(...literals);
    },
  };
  return rule;
}
export function file(): AttributeRule<string> {
  const rule: AttributeRule<string> = custom({
    expected: 'string',
    validator: (value: any): value is string => {
      if (!predicate.isString(value)) {
        throw new ValidationError(value, rule.config.expected);
      }
      if (!predicate.fileExists(value)) {
        throw new FileNotFoundError(value);
      }
      return true;
    },
  });
  return rule;
}
export function directory(): AttributeRule<string> {
  const rule: AttributeRule<string> = custom({
    expected: 'string',
    validator: (value: any): value is string => {
      if (!predicate.isString(value)) {
        throw new ValidationError(value, rule.config.expected);
      }
      if (!predicate.directoryExists(value)) {
        throw new DirectoryNotFoundError(value);
      }
      return true;
    },
  });
  return rule;
}
export function dir(): AttributeRule<string> {
  return directory();
}
export function path(): AttributeRule<string> {
  return alternative(file(), directory());
}
export function number(): NumberAttributeRule {
  let min: number | undefined;
  let max: number | undefined;

  const rule: NumberAttributeRule = {
    ...custom({
      expected: 'number',
      validator: (value: any): value is number => {
        if (!predicate.isNumber(value)) {
          throw new ValidationError(value, rule.config.expected);
        }
        if (predicate.isNumber(min) && predicate.isNumber(max)) {
          if (min <= value && value <= max) {
            return true;
          }
          throw new RangeError(value, min, max);
        }
        else if (predicate.isNumber(min)) {
          if (min <= value) {
            return true;
          }
          throw new LowerLimitError(value, min);
        }
        else if (predicate.isNumber(max)) {
          if (value <= max) {
            return true;
          }
          throw new UpperLimitError(value, max);
        }
        return true;
      },
    }),
    union: <
      Normalized extends Args[number],
      Args extends number[] = Normalized[],
    >(...literals: Args): AttributeRule<Args[number]> => {
      return literalUnion(...literals);
    },
    min: (limit: number) => {
      min = limit;
      return rule;
    },
    max: (limit: number) => {
      max = limit;
      return rule;
    },
    minmax: (min: number, max: number) => {
      return rule.min(min).max(max);
    },
    positive: () => {
      return rule.min(1);
    },
    negative: () => {
      return rule.max(-1);
    },
  } as NumberAttributeRule;
  return rule;
}
export function boolean(): AttributeRule<boolean> {
  const rule: AttributeRule<boolean> = custom({
    expected: 'boolean',
    validator: (value: any): value is boolean => {
      if (predicate.isBoolean(value)) {
        return true;
      }
      throw new ValidationError(value, rule.config.expected);
    },
  });
  return rule;
}
export function bool(): AttributeRule<boolean> {
  return boolean();
}
// #endregion literal rules

// #region object rules
export function object<
  Normalized extends RuleMapToInterface<Args>,
  Args extends RuleMap = InterfaceToRuleMap<Normalized>,
>(ruleMap: Args): ObjectAttributeRule<Normalized> {
  let normalizeProperties: PropertyNormalizers<Normalized>;
  const rule: ObjectAttributeRule<Normalized> = {
    ...custom({
      expected: `{${Object.entries(ruleMap).map(([ key, rule ]) => `${key}: ${rule.config.expected}`).join('; ')}.}`,
      validator: (value: any): value is Normalized => {
        if (!predicate.isObjectLiteral(value)) {
          throw new ValidationError(value, 'object');
        }

        const valueKeys = Object.entries(value).map(([ key ]) => key).sort();
        const propertyKeys = Object.entries(ruleMap).map(([ key ]) => key).sort();

        // If the value is an empty object, an error is raised unless the defined property is also an empty object
        if (valueKeys.length === 0) {
          if (propertyKeys.length === 0) {
            return true;
          }
          throw new ValidationError(value, rule.config.expected);
        }

        // Check if the value has a defined property
        propertyKeys.forEach((key) => {
          const property = ruleMap[key];
          if (property.config.optional) {
            return;
          }
          if (valueKeys.includes(key)) {
            return;
          }
          throw new PropertyFoundNotError(value, key as keyof typeof value);
        });

        // Check each property
        for (const [ key, childValue ] of Object.entries(value)) {
          if (!(key in ruleMap)) {
            throw new PropertyAccessError(value, key as keyof typeof value);
          }

          const property = ruleMap[key];
          try {
            if (property.config.validator(childValue)) {
              continue;
            }
          }
          catch {
          }
          throw new PropertyValidationError(value, key as keyof typeof value, property.config.expected);
        }
        return true;
      },
      normalizer: async<V>(value: V): Promise<Normalized | V> => {
        if (!predicate.isObjectLiteral(value)) {
          return value;
        }

        const normalized: Normalized = {} as Normalized;
        const schemaAccessor = createSchemaAccessor<Normalized>(normalized);
        for await (const [ key, childValue ] of Object.entries(value)) {
          const normalizerOrNormalizeMap = normalizeProperties[key] as PropertyNormalizers<Normalized>[keyof Normalized] | undefined;
          if (normalizerOrNormalizeMap === undefined) {
            normalized[key as keyof Normalized] = childValue as Normalized[keyof Normalized];
            continue;
          }

          normalized[key as keyof Normalized] = (
            predicate.isCallable(normalizerOrNormalizeMap)
              ? normalizerOrNormalizeMap(childValue, schemaAccessor)
              : await getNormalizer(normalizerOrNormalizeMap, childValue)?.(childValue, schemaAccessor)
          ) as Normalized[keyof Normalized];
        }
        return normalized;
      },
    }) as ObjectAttributeRule<Normalized>,
    normalizeProperties: (propertyNormalizers: PropertyNormalizers<Normalized>) => {
      normalizeProperties = { ...normalizeProperties, ...propertyNormalizers };
      return rule;
    },
  };
  return rule;
}
export function array<
  Normalized extends RuleToNormalized<Arg>,
  Arg extends AttributeRule<any> = AttributeRule<Normalized>,
>(elementRule: Arg): AttributeRule<Normalized[]> {
  const rule: AttributeRule<Normalized[]> = {
    ...custom({
      expected: `Array<${elementRule.config.expected}>`,
      validator: (value: any): value is Normalized[] => {
        if (!Array.isArray(value)) {
          throw new ValidationError(value, rule.config.expected);
        }

        value.forEach((childValue, index) => {
          if (!predicate.isNumber(index)) {
            return;
          }
          try {
            if (elementRule.config.validator(childValue)) {
              return;
            }
          }
          catch {
          }
          throw new ElementValidationError(value, index, rule.config.expected);
        });
        return true;
      },
      normalizer: async<V>(value: V): Promise<Normalized[] | V> => {
        if (!Array.isArray(value)) {
          return value;
        }

        const normalized: Normalized[] = [];
        for await (const childValue of value) {
          normalized.push(await elementRule.config.normalizer(childValue) as Normalized);
        }
        return normalized;
      },
    }),
  };
  return rule;
}
export function tuple<
  Normalized extends RulesToTuple<Args>,
  Args extends Array<AttributeRule<any>> = Array<AttributeRule<Normalized>>,
>(...rules: Args): AttributeRule<IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized> {
  return custom({
    expected: `[${rules.map((rule) => rule.config.expected).join(', ')}]`,
    validator: (value: any): value is IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized => {
      if (!Array.isArray(value)) {
        return false;
      }
      if (value.length !== rules.length) {
        return false;
      }
      return value.every((element, index) => {
        const elementRule = rules.at(index);
        if (!elementRule) {
          return false;
        }
        try {
          if (elementRule.config.validator(element)) {
            return true;
          }
        }
        catch {
        }

        throw new ElementValidationError(value, index, elementRule.config.expected);
      });
    },
  });
}
// #endregion object rules


// #region helpers
type CustomConfig<Normalized> = SetRequired<Partial<AttributeRuleConfig<Normalized>>, 'validator'>;
function getNormalizer<Normalized, Owner, Value>(normalizeMap: AttributeNormalizersByType<Normalized, Owner>, value: Value): AttributeNormalizer<any, Normalized, Owner> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!normalizeMap) {
    return undefined;
  }
  switch (typeof value) {
    case 'undefined': return 'undefined' in normalizeMap ? normalizeMap.undefined : undefined;
    case 'string': return 'string' in normalizeMap ? normalizeMap.string : undefined;
    case 'number': return 'number' in normalizeMap ? normalizeMap.number : undefined;
    case 'boolean': return 'boolean' in normalizeMap ? normalizeMap.boolean : undefined;
    case 'object': {
      if (value === null) {
        return 'null' in normalizeMap ? normalizeMap.null : undefined;
      }
      if (Array.isArray(value)) {
        return 'array' in normalizeMap ? normalizeMap.array : undefined;
      }
      return 'object' in normalizeMap ? normalizeMap.object : undefined;
    }
    default: break;
  }
  return 'any' in normalizeMap ? normalizeMap.any : undefined;
}
function createSchemaAccessor<Normalized extends Interface>(normalized: Partial<Normalized>): SchemaAccessor<Normalized> {
  return {
    isValidated<Key extends keyof Normalized>(key: Key): boolean {
      return key in normalized;
    },
    get<Key extends keyof Normalized>(key: Key): Normalized[Key] {
      if (this.isValidated(key)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return normalized[key]!;
      }
      throw Error(`"${String(key)}" is not yet normalized`);
    },
  };
}
// #region helpers
