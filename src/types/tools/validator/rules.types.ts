export type Interface = { [key in string]: any };
export type Rules = Array<AttributeRule<any>>;
export type RuleMap = Record<string, AttributeRule<any>>;
export interface SchemaAccessor<Normalized> {
  get: <K extends keyof Normalized>(key: K) => Normalized[K];
  isValidated: <K extends keyof Normalized>(key: K) => boolean;
}
export type OnError = (err?: Error) => void;

// #region validator
export interface AttributeRuleConfig<Normalized> {
  expected: string;
  optional: boolean;
  normalizeMap: AttributeNormalizersByType<Normalized> | undefined;
  validator: AttributeValidator<Normalized>;
  normalizer: <V>(value: V, onError?: OnError) => Promise<Normalized | V>;
}
export type AttributeValidator<Normalized> = (value: any, onError?: OnError) => value is Normalized;
// #endregion validator

// #region normalizer
export type AttributeNormalizer<Value, Normalized, Owner = undefined> = SyncAttributeNormalizer<Value, Normalized, Owner> | AsyncAttributeNormalizer<Value, Normalized, Owner>;
export type SyncAttributeNormalizer<Value, Normalized, Owner = undefined> =
  Owner extends undefined
    ? (value: Value, schema: undefined, onError?: OnError) => Normalized
    : (value: Value, schema: SchemaAccessor<Owner>, onError?: OnError) => Normalized;
export type AsyncAttributeNormalizer<Value, Normalized, Owner = undefined> =
  Owner extends undefined
    ? (value: Value, schema: undefined, onError?: OnError) => Promise<Normalized>
    : (value: Value, schema: SchemaAccessor<Owner>, onError?: OnError) => Promise<Normalized>;
export interface AttributeNormalizersByType<Normalized, Owner = undefined> {
  null?: AttributeNormalizer<null, Normalized, Owner>;
  undefined?: AttributeNormalizer<undefined, Normalized, Owner>;
  string?: AttributeNormalizer<string, Normalized, Owner>;
  number?: AttributeNormalizer<number, Normalized, Owner>;
  boolean?: AttributeNormalizer<boolean, Normalized, Owner>;
  object?: AttributeNormalizer<Record<string, any>, Normalized, Owner>;
  array?: AttributeNormalizer<any[], Normalized, Owner>;
  any?: AttributeNormalizer<any, Normalized, Owner>;
}
export type PropertyNormalizers<Normalized> = {
  [Key in keyof Partial<Normalized>]: AttributeNormalizer<any, Normalized[Key], Normalized> | AttributeNormalizersByType<Normalized[Key], Normalized>
};
// #endregion normalizer

// #region rule
export interface AttributeRule<Normalized> {
  config: AttributeRuleConfig<Normalized>;
  default: (defaultValue: Normalized | AttributeNormalizer<undefined, Normalized>) => this;
  optional: () => AttributeRule<Normalized | undefined>;
  normalize: (normalizerOrNormalizeMap: AttributeNormalizer<any, Normalized> | AttributeNormalizersByType<Normalized>) => this;
}

export type LiteralType = string | number | boolean;
export interface LiteralAttributeRule<Normalized extends LiteralType> extends AttributeRule<Normalized> {
  union: <
    Type extends Args[number],
    Args extends LiteralType[] = Type[],
  >(...literals: Args) => AttributeRule<Args[number]>;
}
export interface StringAttributeRule extends AttributeRule<string> {
  union: <
    Type extends Args[number],
    Args extends string[] = Type[],
  >(...literals: Args) => AttributeRule<Args[number]>;
}
export interface NumberAttributeRule extends AttributeRule<number> {
  union: <
    Type extends Args[number],
    Args extends number[] = Type[],
  >(...literals: Args) => AttributeRule<Args[number]>;
  min: (number: number) => this;
  max: (number: number) => this;
  minmax: (min: number, max: number) => this;
  positive: () => this;
  negative: () => this;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ArrayAttributeRule<Normalized> extends AttributeRule<Normalized> {
}
export interface ObjectAttributeRule<Normalized> extends AttributeRule<Normalized> {
  config: {
    propertyNormalizers: PropertyNormalizers<Normalized>;
  } & AttributeRuleConfig<Normalized>;
  normalizeProperties: (propertyNormalizers: PropertyNormalizers<Normalized>) => this;
}
// #endregion rule

// #region type converter
// #region normalized <-> rule
export type RuleToNormalized<Rule> =
  Rule extends AttributeRule<infer U>
    ? U
    : never;
export type NormalizedToRule<Normalized> =
  Normalized extends boolean
    ? AttributeRule<boolean>
    : AttributeRule<Normalized>;
// #endregion normalized <-> rule

// #region union <-> rules
export type UnionToRules<Union> = Array<UnionToRule<Union>>;
export type UnionToRule<Union> =
  Union extends infer U
    ? NormalizedToRule<U>
    : never;
export type RulesToUnion<Rules> =
    Rules extends Array<AttributeRule<any>>
      ? RuleToNormalized<Rules[number]>
      : never;
// #endregion union <-> rules

// #region interface <-> rule map
export type InterfaceToRuleMap<Normalized> =
  Normalized extends Interface
    ? { [key in keyof Normalized]: AttributeRule<Normalized[key]> }
    : never;
export type RuleMapToInterface<Rule> =
  Rule extends RuleMap
    ? { [key in keyof Rule]: RuleToNormalized<Rule[key]> }
    : never;
// #endregion interface <-> rule map

// #region array <-> rule
export type RuleToNormalizedList<Rule> =
  Rule extends AttributeRule<infer Normalized>
    ? Normalized[]
    : never;
export type RulesToTuple<Rules> =
Rules extends Array<AttributeRule<any>>
  ? Rules extends [ infer Head, ...infer Rest]
    ? [ RuleToNormalized<Head>, ...RulesToTuple<Rest> ]
    : []
  : never;
// #endregion array <-> rule
// #endregion type converter
