import { TypePredicate } from '../predicate.types';

export type Normalizer<V, R> = SyncNormalizer<V, R> | AsyncNormalizer<V, R>;
export type SyncNormalizer<V, R> = (value: V) => V | R;
export type AsyncNormalizer<V, R> = (value: V) => Promise<V | R>;

export interface NormalizeMap<T> {
  null?: Normalizer<null, T>;
  undefined?: Normalizer<undefined, T>;
  string?: Normalizer<string, T>;
  number?: Normalizer<number, T>;
  boolean?: Normalizer<boolean, T>;
  object?: Normalizer<Record<string, any>, T>;
  array?: Normalizer<any[], T>;
  any?: Normalizer<any, T>;
}
export interface ValidatorRuleBase<T> {
  default: T | undefined;
  optional: boolean;
  __normalizer: Normalizer<any, T>;
  validator: TypePredicate<T>;
  normalize: (normalizerOrNormalizeMap: Normalizer<any, T> | NormalizeMap<T>) => this;
}
export type ValidatorRule<T extends Record<any, any> | any[]> =
  | StringValidatorRule
  | NumberValidatorRule
  | BooleanValidatorRule
  | (T extends any[] ? ArrayValidatorRule<T> : ObjectValidatorRule<T>);

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
export interface ObjectValidatorRule<R extends Record<string, any>> extends ValidatorRuleBase<R> {
  properties: { [key in keyof R]: ValidatorRule<R[keyof R]> };
}
export interface ArrayValidatorRule<R extends any[]> extends ValidatorRuleBase<R> {
  element: ValidatorRule<R[number]>;
}
