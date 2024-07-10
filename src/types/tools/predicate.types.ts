export type Predicate = (value: any) => boolean;
export type InterfaceRule = {
  [ key in string ]: Predicate | InterfaceRule;
};
