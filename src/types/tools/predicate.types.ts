export type Predicate = (value: any) => boolean;
export type TypePredicate<T> = (value: any) => value is T;
export type InterfaceRule = {
  [ key in string ]: Predicate | InterfaceRule;
};
