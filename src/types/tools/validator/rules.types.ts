import { Primitive } from 'type-fest';
import { TypePredicate } from '../predicate.types';

export type PickResult<Rule extends ValidatorRule<any>> = PickResultByRule<Rule>;
export type PickResultByRule<Rule extends ValidatorRule<any>> = Rule extends ValidatorRule<infer U> ? U : never;
export type PickResultByMap<Rule extends Record<string, ValidatorRule<any>>> = { [key in keyof Rule]: PickResult<Rule[key]> };
export type PickResultsByRule<Rule extends ValidatorRule<any>> =
  Rule extends ValidatorRule<infer Normalized>
    ? Normalized[]
    : never;
export type PickResultByRules<Rules extends Array<ValidatorRule<any>>> =
  Rules extends Array<infer Rule>
    ? Rule extends ValidatorRule<infer Normalized>
      ? Normalized[][number]
      : never
    : never;

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
export interface ValidatorRule<Normalized> {
  __optional: boolean;
  default: (defaultValue: Normalized | Normalizer<undefined, Normalized>) => this;
  optional: () => this;
  __normalizer: Normalizer<any, any>;
  validator: TypePredicate<Normalized>;
  normalize: (normalizerOrNormalizeMap: Normalizer<any, Normalized> | NormalizeMap<Normalized>) => this;
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
export interface AlternativeValidatorRule<Rules extends Array<ValidatorRule<any>>> extends ValidatorRule<PickResultByRules<Rules>> {
  rules: Rules;
}
