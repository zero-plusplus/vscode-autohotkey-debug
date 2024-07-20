import { Primitive } from 'type-fest';
import { TypePredicate } from '../predicate.types';

export type PickResult<T extends ValidatorRule<any>> = PickResultByRule<T>;
export type PickResultByRule<T extends ValidatorRule<any>> = T extends ValidatorRule<infer U> ? U : never;
export type PickResultByMap<T extends Record<string, ValidatorRule<any>>> = { [key in keyof T]: PickResult<T[key]> };
export type PickResultsByRule<T extends ValidatorRule<any>> =
  T extends ValidatorRule<infer U>
    ? U[]
    : never;
export type PickResultByRules<T extends Array<ValidatorRule<any>>> =
  T extends Array<infer U>
    ? U extends ValidatorRule<infer I>
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
export interface ValidatorRule<R> {
  __optional: boolean;
  default: (defaultValue: R | Normalizer<undefined, R>) => this;
  optional: () => OptionalValidatorRule<this>;
  __normalizer: Normalizer<any, any>;
  validator: TypePredicate<R>;
  normalize: (normalizerOrNormalizeMap: Normalizer<any, R> | NormalizeMap<R>) => this;
}

export interface LiteralSubRules<Normalized extends Primitive> {
  union: <Args extends Normalized[]>(...values: Args) => ValidatorRule<Args[number]>;
}
export interface NumberSubRules extends LiteralSubRules<number> {
  min: (number: number) => this;
  max: (number: number) => this;
  minmax: (min: number, max: number) => this;
  positive: () => this;
  negative: () => this;
}
export type PropertyValidationMap<R> = { [key in keyof R]: ValidatorRule<any> };
export interface ObjectValidatorRule<RuleMap extends Record<string, ValidatorRule<any>>> extends ValidatorRule<PickResultByMap<RuleMap>> {
  properties: RuleMap;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TemplateValidatorRule<R extends Record<string, any>> extends ObjectValidatorRule<{ [key in keyof R]: ValidatorRule<R[key]> }> {
}
export interface ArrayValidatorRule<Rule extends ValidatorRule<any>> extends ValidatorRule<PickResultsByRule<Rule>> {
  element: Rule;
}
export interface OptionalValidatorRule<Rule extends ValidatorRule<any>> extends ValidatorRule<PickResult<Rule> | undefined> {
  __optional: true;
}
export interface AlternativeValidatorRule<Rules extends Array<ValidatorRule<any>>> extends ValidatorRule<PickResultByRules<Rules>> {
  rules: Rules;
}
