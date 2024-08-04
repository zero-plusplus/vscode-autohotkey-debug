import { RuleToNormalized, ValidatorRule } from './rules.types';

export type Schema<Rule extends ValidatorRule<any>> = (value: any) => Promise<RuleToNormalized<Rule>>;
