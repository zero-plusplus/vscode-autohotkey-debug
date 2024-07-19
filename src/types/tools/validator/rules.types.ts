import { TypePredicate } from '../predicate.types';

export type PickResult<T extends ValidatorRuleBase<any>> = PickResultByRule<T>;
export type PickResultByRule<T extends ValidatorRuleBase<any>> = T extends ValidatorRuleBase<infer U> ? U : never;
export type PickResultByMap<T extends Record<string, ValidatorRuleBase<any>>> = { [key in keyof T]: PickResult<T[key]> };
export type PickResultsByRule<T extends ValidatorRuleBase<any>> =
  T extends ValidatorRuleBase<infer U>
    ? U[]
    : never;
export type PickResultByRules<T extends Array<ValidatorRuleBase<any>>> =
  T extends Array<infer U>
    ? U extends ValidatorRuleBase<infer I>
      ? I[][number]
      : never
    : never;

export type Normalizer<V, R> = SyncNormalizer<V, R> | AsyncNormalizer<V, R>;
export type SyncNormalizer<V, R> = (value: V) => V | R;
export type AsyncNormalizer<V, R> = (value: V) => Promise<V | R>;

export interface NormalizeMap<R> {
  null?: Normalizer<null, R>;
  undefined?: Normalizer<undefined, R>;
  string?: Normalizer<string, R>;
  number?: Normalizer<number, R>;
  boolean?: Normalizer<boolean, R>;
  object?: Normalizer<Record<string, any>, R>;
  array?: Normalizer<any[], R>;
  any?: Normalizer<any, R>;
}
export interface ValidatorRuleBase<R> {
  default: R | undefined;
  optional: boolean;
  __normalizer: Normalizer<any, any>;
  validator: TypePredicate<R>;
  normalize: (normalizerOrNormalizeMap: Normalizer<any, R> | NormalizeMap<R>) => this;
}
export type ValidatorRule<T> =
  T extends string ? StringValidatorRule
    : T extends number ? NumberValidatorRule
      : T extends boolean ? BooleanValidatorRule
        : T extends ValidatorRuleBase<any>
          ? ArrayValidatorRule<T>
          : T extends Record<any, any>
            ? ObjectValidatorRule<T>
            : ValidatorRuleBase<T>;

export interface StringValidatorRule extends ValidatorRuleBase<string> {
  union: <R extends string[]>(...strings: R) => UnionValidatorRule<R[number]>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FileValidatorRule extends ValidatorRuleBase<string> {
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DirectoryValidatorRule extends ValidatorRuleBase<string> {
}
export interface PathValidatorRule extends FileValidatorRule, DirectoryValidatorRule {
}
export interface NumberValidatorRule extends ValidatorRuleBase<number> {
  min: (number: number) => this;
  max: (number: number) => this;
  minmax: (min: number, max: number) => this;
  positive: () => this;
  negative: () => this;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BooleanValidatorRule extends ValidatorRuleBase<boolean> {
}
export type PropertyValidationMap<R> = { [key in keyof R]: ValidatorRuleBase<any> };
export interface ObjectValidatorRule<RuleMap extends Record<string, ValidatorRuleBase<any>>> extends ValidatorRuleBase<PickResultByMap<RuleMap>> {
  properties: RuleMap;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TemplateValidatorRule<R extends Record<string, any>> extends ObjectValidatorRule<{ [key in keyof R]: ValidatorRuleBase<R[keyof R]> }> {
}
export interface ArrayValidatorRule<Rule extends ValidatorRuleBase<any>> extends ValidatorRuleBase<PickResultsByRule<Rule>> {
  element: Rule;
}
export interface OptionalValidatorRule<Rule extends ValidatorRuleBase<any>> extends ValidatorRuleBase<PickResult<Rule> | undefined> {
  optional: true;
}
export interface AlternativeValidatorRule<Rules extends Array<ValidatorRuleBase<any>>> extends ValidatorRuleBase<PickResultByRules<Rules>> {
  rules: Rules;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnionValidatorRule<R> extends ValidatorRuleBase<R> {
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TupleValidatorRule<R> extends ValidatorRuleBase<R> {
}
