import { TypePredicate } from '../predicate.types';

export type PickResult<T extends ValidatorRule<any>> =
  T extends ObjectValidatorRule<infer U>
    ? PickResult<U>
    : T extends ArrayValidatorRule<infer U>
      ? PickResult<U>
      : T extends AlternativeValidatorRule<infer U>
        ? PickResult<U>[number]
        : T extends OptionalValidatorRule<infer U>
          ? PickResult<U> | undefined
          : T extends StringValidatorRule
            ? string
            : T extends NumberValidatorRule
              ? number
              : T extends BooleanValidatorRule
                ? boolean
                : T extends Record<string, ValidatorRule<any>>
                  ? { [key in keyof T]: PickResult<T[key]> }
                  : T extends Array<ValidatorRule<infer U>>
                    ? Array<PickResult<U>>
                    : T extends ValidatorRuleBase<any>
                      ? PickResultByRule<T>
                      : never;

export type PickResultByRule<T extends ValidatorRuleBase<any>> = T extends ValidatorRuleBase<infer U> ? U : never;
export type PickResultByMap<T extends Record<string, ValidatorRule<any>>> = { [key in keyof T]: PickResult<T[key]> };
export type PickResultByRules<T extends Array<ValidatorRule<any>>> =
  T extends Array<infer U>
    ? Array<PickResult<U>>
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
        : T extends ValidatorRule<any>
          ? ArrayValidatorRule<T>
          : T extends Record<any, any>
            ? ObjectValidatorRule<T>
            : ValidatorRuleBase<T>;

export interface StringValidatorRule extends ValidatorRuleBase<string> {
  enum: (...string: string[]) => this;
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
export type PropertyValidationMap<R> = { [key in keyof R]: ValidatorRule<any> };
export interface ObjectValidatorRule<RuleMap extends Record<string, ValidatorRule<any>>> extends ValidatorRuleBase<PickResult<RuleMap>> {
  properties: RuleMap;
}
export interface ArrayValidatorRule<Rule extends ValidatorRule<any>> extends ValidatorRuleBase<Array<PickResult<Rule>>> {
  element: Rule;
}
export interface OptionalValidatorRule<Rule extends ValidatorRuleBase<any>> extends ValidatorRuleBase<PickResult<Rule> | undefined> {
  optional: true;
}
export interface AlternativeValidatorRule<Rules extends Array<ValidatorRuleBase<any>>> extends ValidatorRuleBase<PickResult<Rules>> {
  rules: Rules;
}
