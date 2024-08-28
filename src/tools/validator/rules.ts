import * as predicate from '../predicate';
import { AttributeNormalizer, AttributeNormalizersByType, AttributeRule, AttributeRuleConfig, Interface, InterfaceToRuleMap, NumberAttributeRule, ObjectAttributeRule, PathAttributeRule, PropertyNormalizers, RuleMap, RuleMapToInterface, RuleToNormalized, Rules, RulesToTuple, RulesToUnion, SchemaAccessor, StringAttributeRule, UnionToRules } from '../../types/tools/validator';
import { DirectoryNotFoundError, ElementValidationError, FileNotFoundError, LowerLimitError, NormalizationWarning, PropertyAccessError, PropertyFoundNotError, PropertyValidationError, RangeError, UpperLimitError, ValidationError } from './error';
import { IsAny, JsonValue, OnError, SetRequired } from 'type-fest/';
import { range } from '../utils';

export function sortRules<Rule extends AttributeRule<any>>([ attributeName_a, rule_a ]: [ string, Rule ], [ attributeName_b, rule_b ]: [ string, Rule ]): number {
  // Case 1: `false` is highest priority
  if (rule_a.config.depends === false) {
    if (rule_b.config.depends === false) {
      return 0;
    }
    return -1;
  }
  if (rule_b.config.depends === false) {
    return 1;
  }

  // Case 2: `undefined` is second priority
  if (rule_a.config.depends === undefined && rule_b.config.depends === undefined) {
    return 0;
  }
  if (rule_a.config.depends === undefined) {
    return -1;
  }
  if (rule_b.config.depends === undefined) {
    return 1;
  }

  // Case 3: `true` is the lowest possible priority
  if (rule_a.config.depends === true) {
    if (rule_b.config.depends === true) {
      return 0;
    }
    if (rule_b.config.depends.includes(attributeName_a)) {
      return -1;
    }
    return 1;
  }
  if (rule_b.config.depends === true) {
    if (rule_a.config.depends.includes(attributeName_b)) {
      return 1;
    }
    return -1;
  }

  // Case 4: `string[]` is lower in precedence than the specified attribute. Therefore, it may have a lower priority than if `true` were specified
  if (rule_a.config.depends.includes(attributeName_b)) {
    return 1;
  }
  if (rule_b.config.depends.includes(attributeName_a)) {
    return -1;
  }
  return 0;
}
export function custom<Normalized>(validatorOrCustomConfig: CustomConfig<Normalized>['validator'] | CustomConfig<Normalized>): AttributeRule<Normalized> {
  const customConfig: CustomConfig<Normalized> = predicate.isCallable(validatorOrCustomConfig) ? { validator: validatorOrCustomConfig } : validatorOrCustomConfig;
  const config: AttributeRule<Normalized>['config'] = {
    normalizeMap: {},
    optional: false,
    depends: undefined,
    normalizer: async<Value>(value: Value, onError: OnError): Promise<Normalized | Value> => {
      if (!config.normalizeMap) {
        return Promise.resolve(value);
      }
      const normalizer = getNormalizer(config.normalizeMap, value);
      if (!normalizer) {
        return Promise.resolve(value);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return normalizer(config.normalizeMap, value as any, onError);
    },
    expected: 'any',
    ...customConfig,
    validator: (value: any, onError: OnError): value is Normalized => {
      if (config.optional && value === undefined) {
        return true;
      }
      return customConfig.validator(value, onError);
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
    immediate() {
      return immediate(rule);
    },
    lazy() {
      return lazy(rule);
    },
    depends: (...names) => {
      return depends(rule, names);
    },
  };
  return rule;
}

// #region combinator rules
export function immediate<Rule extends AttributeRule<any>>(rule: Rule): Rule {
  return { ...rule, config: { ...rule.config, depends: false } };
}
export function lazy<Rule extends AttributeRule<any>>(rule: Rule): Rule {
  return { ...rule, config: { ...rule.config, depends: true } };
}
export function depends<Rule extends AttributeRule<any>>(rule: Rule, name: string | string[]): Rule {
  return { ...rule, config: { ...rule.config, depends: name } };
}
export function optional<
  Normalized extends RuleToNormalized<Rule>,
  Rule extends AttributeRule<any> = AttributeRule<Normalized>,
>(validatorRule: Rule): AttributeRule<RuleToNormalized<Rule> | undefined> {
  return custom({ ...validatorRule.config, optional: true, expected: `${validatorRule.config.expected} | undefined` }) as AttributeRule<RuleToNormalized<Rule> | undefined>;
}
export function asString(rule: AttributeRule<any>): StringAttributeRule {
  const stringRule = string();
  return {
    ...stringRule,
    config: {
      ...rule.config,
      validator: stringRule.config.validator,
    },
  };
}

export function alternative<
  Normalized extends RulesToUnion<Args>,
  Args extends Rules = UnionToRules<Normalized>,
>(...validatorRules: Args): AttributeRule<IsAny<Normalized> extends true ? RulesToUnion<Args> : Normalized> {
  const alternativeRules = validatorRules.map((rule) => ({ ...rule, config: { ...rule.config, optional: false } }));
  const rule: AttributeRule<Normalized> = custom({
    expected: alternativeRules.map((rule) => rule.config.expected).join(' | '),
    validator: (value: any, onError: OnError): value is Normalized => {
      const result = alternativeRules.some((rule) => {
        try {
          return rule.config.validator(value, onError);
        }
        catch {
        }
        return false;
      });

      if (result) {
        return true;
      }

      onError(new ValidationError(value, rule.config.expected));
      return false;
    },
    normalizer: async<Value>(value: Value, onError: OnError): Promise<Normalized | Value> => {
      for await (const validatorRule of validatorRules) {
        try {
          const normalized = await validatorRule.config.normalizer(value, onError) as Normalized;
          if (validatorRule.config.validator(normalized, onError)) {
            return Promise.resolve(normalized);
          }
        }
        catch {
        }
      }
      return Promise.resolve(value);
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
    expected: literals.map((literal) => JSON.stringify(literal, undefined, 4)).join(' | '),
    validator: (value: any, onError: OnError): value is Args[number] => {
      if (literals.some((literal) => literal === value)) {
        return true;
      }
      onError(new ValidationError(value, rule.config.expected));
      return false;
    },
  });
  return rule;
}
// #endregion combinator rules

// #region literal rules
export function string(): StringAttributeRule {
  const rule: StringAttributeRule = {
    ...custom({
      expected: 'string',
      validator: (value: any, onError: OnError): value is string => {
        if (predicate.isString(value)) {
          return true;
        }
        onError(new ValidationError(value, rule.config.expected));
        return false;
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
export function file(): PathAttributeRule {
  const rule: PathAttributeRule = {
    ...custom({
      expected: 'file',
      validator: (value: any, onError: OnError): value is string => {
        if (!predicate.isString(value)) {
          onError(new ValidationError(value, rule.config.expected));
          return false;
        }
        if (!predicate.fileExists(value)) {
          onError(new FileNotFoundError(value));
          return false;
        }
        return true;
      },
    }) as PathAttributeRule,
    asString: (): StringAttributeRule => {
      return asString(rule);
    },
  };
  return rule;
}
export function directory(): PathAttributeRule {
  const rule: PathAttributeRule = {
    ...custom({
      expected: 'directory',
      validator: (value: any, onError: OnError): value is string => {
        if (!predicate.isString(value)) {
          onError(new ValidationError(value, rule.config.expected));
          return false;
        }
        if (!predicate.directoryExists(value)) {
          onError(new DirectoryNotFoundError(value));
          return false;
        }
        return true;
      },
    }) as PathAttributeRule,
    asString: (): StringAttributeRule => {
      return asString(rule);
    },
  };
  return rule;
}
export function dir(): PathAttributeRule {
  return directory();
}
export function path(): PathAttributeRule {
  const baseRule = alternative(file(), directory());
  const rule: PathAttributeRule = {
    ...baseRule,
    config: {
      ...baseRule.config,
      expected: 'file / directory',
    },
    asString(): StringAttributeRule {
      return asString(baseRule);
    },
  } as PathAttributeRule;
  return rule;
}
export function number(): NumberAttributeRule {
  let min: number | undefined;
  let max: number | undefined;

  const rule: NumberAttributeRule = {
    ...custom({
      expected: 'number',
      validator: (value: any, onError: OnError): value is number => {
        if (!predicate.isNumber(value)) {
          onError(new ValidationError(value, rule.config.expected));
          return false;
        }
        if (predicate.isNumber(min) && predicate.isNumber(max)) {
          if (min <= value && value <= max) {
            return true;
          }
          onError(new RangeError(value, min, max));
          return false;
        }
        else if (predicate.isNumber(min)) {
          if (min <= value) {
            return true;
          }
          onError(new LowerLimitError(value, min));
          return false;
        }
        else if (predicate.isNumber(max)) {
          if (value <= max) {
            return true;
          }
          onError(new UpperLimitError(value, max));
          return false;
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
    validator: (value: any, onError: OnError): value is boolean => {
      if (predicate.isBoolean(value)) {
        return true;
      }
      onError(new ValidationError(value, rule.config.expected));
      return false;
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
      expected: JSON.stringify(Object.fromEntries(Object.entries(ruleMap).map(([ name, rule ]) => [ name, rule.config.expected ])), undefined, 4),
      validator: (value: any, onError: OnError): value is Normalized => {
        if (!predicate.isObjectLiteral(value)) {
          onError(new ValidationError(value, rule.config.expected));
          return false;
        }

        const valueKeys = Object.entries(value).map(([ key ]) => key).sort();
        const propertyKeys = Object.entries(ruleMap).map(([ key ]) => key).sort();

        // If the value is an empty object, an error is raised unless the defined property is also an empty object
        if (valueKeys.length === 0) {
          if (propertyKeys.length === 0) {
            return true;
          }
          onError(new ValidationError(value, rule.config.expected));
          return false;
        }

        // Check if the value has a defined property
        (valueKeys.length < propertyKeys.length ? propertyKeys : valueKeys).forEach((key) => {
          const property = ruleMap[key];
          if (property.config.optional) {
            return;
          }
          if (valueKeys.includes(key)) {
            return;
          }
          onError(new PropertyFoundNotError(value, key as keyof typeof value));
        });

        // Check each property
        for (const [ key, childValue ] of Object.entries(value)) {
          if (!(key in ruleMap)) {
            onError(new PropertyAccessError(value, key as keyof typeof value));
            continue;
          }

          const property = ruleMap[key];
          try {
            if (property.config.validator(childValue, onError)) {
              continue;
            }
          }
          catch {
          }
          onError(new PropertyValidationError(value, key as keyof typeof value, property.config.expected));
          return false;
        }
        return true;
      },
      normalizer: async<Value>(value: Value, onError: OnError): Promise<Normalized | Value> => {
        if (!predicate.isObjectLiteral(value)) {
          return value;
        }

        const normalized: Normalized = {} as Normalized;
        const schemaAccessor = createSchemaAccessor<Normalized>(value, normalized);
        const ruleEntries = Object.entries(ruleMap).sort(sortRules);
        for await (const entry of ruleEntries) {
          const key = entry[0] as keyof Normalized;
          const childRule = entry[1];
          const childValue = value[key as keyof typeof value];

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const normalizerOrNormalizeMap = normalizeProperties?.[key];
          if (normalizerOrNormalizeMap === undefined) {
            normalized[key] = await childRule.config.normalizer(childValue, onError) as unknown as Normalized[keyof Normalized];
            continue;
          }
          normalized[key] = await childRule.config.normalizer(
            predicate.isCallable(normalizerOrNormalizeMap)
              ? normalizerOrNormalizeMap(childValue, schemaAccessor, onError)
              : await getNormalizer(normalizerOrNormalizeMap, childValue)?.(childValue, schemaAccessor, onError) ?? childValue,
            onError,
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
export function record<
  Normalized extends Record<RuleToNormalized<Key>, RuleToNormalized<Value>>,
  Key extends AttributeRule<string> = AttributeRule<string>,
  Value extends AttributeRule<any> = AttributeRule<any>,
>(keyRule: Key, valueRule: Value): AttributeRule<Normalized> {
  const rule: AttributeRule<Normalized> = {
    ...custom({
      expected: `Record<${keyRule.config.expected}, ${valueRule.config.expected}`,
      validator: (value: any, onError: OnError): value is Normalized => {
        if (!predicate.isObject(value)) {
          onError(new ValidationError(value, `Record<${keyRule.config.expected}, ${valueRule.config.expected}`));
          return false;
        }

        for (const [ key, childValue ] of Object.entries(value)) {
          try {
            if (keyRule.config.validator(key, onError)) {
              try {
                if (valueRule.config.validator(childValue, onError)) {
                  continue;
                }
              }
              catch {
                onError(new PropertyValidationError(value, key as keyof typeof value, valueRule.config.expected));
              }
            }
          }
          catch (e) {
            if (e instanceof PropertyValidationError) {
              onError(e);
            }
            else {
              onError(new PropertyAccessError(value, key as keyof typeof value));
            }
          }
        }
        return true;
      },
      normalizer: async<Value>(value: Value, onError: OnError): Promise<Normalized | Value> => {
        if (!predicate.isObjectLiteral(value)) {
          return value;
        }

        const normalized: Normalized = {} as Normalized;
        for await (const [ key, childValue ] of Object.entries(value)) {
          const normalizedChildValue = await valueRule.config.normalizer(childValue, onError) as Normalized[keyof Normalized];
          normalized[key] = normalizedChildValue;
        }
        return normalized;
      },
    }),
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
      validator: (value: any, onError: OnError): value is Normalized[] => {
        if (!Array.isArray(value)) {
          onError(new ValidationError(value, rule.config.expected));
          return false;
        }

        value.forEach((childValue, index) => {
          if (!predicate.isNumber(index)) {
            return;
          }
          try {
            if (elementRule.config.validator(childValue, onError)) {
              return;
            }
          }
          catch {
          }
          onError(new ElementValidationError(value, index, rule.config.expected));
        });
        return true;
      },
      normalizer: async<V>(value: V, onError: OnError): Promise<Normalized[] | V> => {
        if (!Array.isArray(value)) {
          return value;
        }

        const normalized: Normalized[] = [];
        for await (const childValue of value) {
          const normalizedChildValue = await elementRule.config.normalizer(childValue, onError) as Normalized;
          normalized.push(normalizedChildValue);
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
    expected: JSON.stringify(rules.map((rule) => rule.config.expected, 4)),
    validator: (value: any, onError): value is IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized => {
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
          if (elementRule.config.validator(element, onError)) {
            return true;
          }
        }
        catch {
        }

        onError(new ElementValidationError(value, index, elementRule.config.expected));
        return false;
      });
    },
    normalizer: async<Value>(value: Value, onError: OnError): Promise<(IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized) | Value> => {
      if (!Array.isArray(value)) {
        return value;
      }

      const normalized: Normalized[] = [];
      for await (const index of range(rules.length)) {
        const rule = rules[index];
        if (value.length <= index) {
          onError(new NormalizationWarning(`The elements after ${index} were ignored.`));
          break;
        }
        const childValue = value[index] as typeof value[keyof typeof value];
        const normalizedChildValue = await rule.config.normalizer(childValue, onError) as Normalized;
        normalized.push(normalizedChildValue);
      }
      return normalized as IsAny<Normalized> extends true ? RulesToTuple<Args> : Normalized;
    },
  });
}
// #endregion object rules


// #region helpers
type CustomConfig<Normalized> = SetRequired<Partial<AttributeRuleConfig<Normalized>>, 'validator'>;
function getNormalizer<Normalized, Owner, Value>(normalizeMap: AttributeNormalizersByType<Normalized, Owner> | undefined, value: Value): AttributeNormalizer<any, Normalized, Owner> | undefined {
  if (!normalizeMap) {
    return undefined;
  }

  switch (typeof value) {
    case 'undefined': return 'undefined' in normalizeMap ? normalizeMap.undefined?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
    case 'string': return 'string' in normalizeMap ? normalizeMap.string?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
    case 'number': return 'number' in normalizeMap ? normalizeMap.number?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
    case 'boolean': return 'boolean' in normalizeMap ? normalizeMap.boolean?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
    case 'object': {
      if (value === null) {
        return 'null' in normalizeMap ? normalizeMap.null?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
      }
      if (Array.isArray(value)) {
        return 'array' in normalizeMap ? normalizeMap.array?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
      }
      return 'object' in normalizeMap ? normalizeMap.object?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
    }
    default: break;
  }
  return 'any' in normalizeMap ? normalizeMap.any?.bind(normalizeMap) as AttributeNormalizer<any, Normalized, Owner> : undefined;
}
function createSchemaAccessor<Normalized extends Interface>(raw: object, normalized: Partial<Normalized>): SchemaAccessor<Normalized> {
  return {
    isNormalized<Key extends keyof Normalized>(key: Key): boolean {
      return key in normalized;
    },
    has: (key: keyof Normalized): boolean => {
      return key in raw;
    },
    getNormalizedAttribute<Key extends keyof Normalized>(key: Key): Normalized[Key] {
      if (this.isNormalized(key)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return normalized[key]!;
      }
      throw Error(`"${String(key)}" is not yet normalized`);
    },
    getRawAttribute<T>(key: keyof Partial<Normalized>): T | undefined {
      if (key in raw) {
        return raw[key as string] as T | undefined;
      }
      return undefined;
    },
  };
}
// #region helpers
