import { JsonPrimitive } from 'type-fest';
import { TypePredicate } from '../predicate.types';

export type Interface = { [key in string]: any };
export type Rules = Array<ValidatorRule<any>>;
export type RuleMap = Record<string, ValidatorRule<any>>;

// #region normalizer
export type Normalizer<Before, After> = SyncNormalizer<Before, After> | AsyncNormalizer<Before, After>;
export type SyncNormalizer<Before, After> = (value: Before) => Before | After;
export type AsyncNormalizer<Before, After> = (value: Before) => Promise<Before | After>;

export interface NormalizeMap<Normalized> {
  null?: Normalizer<null, Normalized>;
  undefined?: Normalizer<undefined, Normalized>;
  string?: Normalizer<string, Normalized>;
  number?: Normalizer<number, Normalized>;
  boolean?: Normalizer<boolean, Normalized>;
  object?: Normalizer<Record<string, any>, Normalized>;
  array?: Normalizer<any[], Normalized>;
  any?: Normalizer<any, Normalized>;
}
// #endregion normalizer

// #region validator
export interface ValidatorRule<Normalized> {
  __optional: boolean;
  default: (defaultValue: Normalized | Normalizer<undefined, Normalized>) => this;
  optional: () => ValidatorRule<Normalized | undefined>;
  __normalizer: Normalizer<any, any>;
  validator: TypePredicate<Normalized>;
  normalize: (normalizerOrNormalizeMap: Normalizer<any, Normalized> | NormalizeMap<Normalized>) => this;
}
export interface LiteralValidatorUtils<Type extends JsonPrimitive = JsonPrimitive | true | false> {
  union: <Normalized extends Type, Args extends Normalized[] = Normalized[]>(...values: Args) => ValidatorRule<Args[number]>;
}
export interface NumberValidatorUtils extends LiteralValidatorUtils<number> {
  min: (number: number) => this;
  max: (number: number) => this;
  minmax: (min: number, max: number) => this;
  positive: () => this;
  negative: () => this;
}
// #endregion validator

// #region type converter
// #region normalized <-> rule
export type RuleToNormalized<Rule> =
  Rule extends ValidatorRule<infer U>
    ? U
    : never;
export type NormalizedToRule<Normalized> =
  Normalized extends infer U
    ? U extends boolean
      ? ValidatorRule<boolean>
      : ValidatorRule<Normalized>
    : ValidatorRule<Normalized>;
// #endregion normalized <-> rule

// #region union <-> rules
export type UnionToRules<Union> = Array<UnionToRule<Union>>;
export type UnionToRule<Union> =
  Union extends infer U
    ? NormalizedToRule<U>
    : never;
export type RulesToUnion<Rules> =
    Rules extends Array<ValidatorRule<any>>
      ? RuleToNormalized<Rules[number]>
      : never;
// #endregion union <-> rules

// #region interface <-> rule map
export type InterfaceToRuleMap<Normalized> =
  Normalized extends Interface
    ? { [key in keyof Normalized]: NormalizedToRule<Normalized[key]> }
    : never;
export type RuleMapToInterface<Rule> =
  Rule extends RuleMap
    ? { [key in keyof Rule]: RuleToNormalized<Rule[key]> }
    : never;
// #endregion interface <-> rule map

// #region array <-> rule
export type RuleToNormalizedList<Rule> =
  Rule extends ValidatorRule<infer Normalized>
    ? Normalized[]
    : never;
export type RulesToTuple<Rules> =
Rules extends Array<ValidatorRule<any>>
  ? Rules extends [ infer Head, ...infer Rest]
    ? [ RuleToNormalized<Head>, ...RulesToTuple<Rest> ]
    : []
  : never;
// #endregion array <-> rule
// #endregion type converter
