import { AttributeRule, RuleToNormalized } from './rules.types';

export type Schema<Rule extends AttributeRule<any>> = (value: any) => Promise<RuleToNormalized<Rule>>;
