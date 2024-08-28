import { AttributeRule, RuleToNormalized } from './rules.types';

export interface Schema<Rule extends AttributeRule<any>> {
  validate: (value: any) => Promise<boolean>;
  normalize: (value: any) => Promise<RuleToNormalized<Rule>>;
  /**
   * If verification fails, normalization is performed and then verification is performed again.
   */
  apply: (value: any) => Promise<RuleToNormalized<Rule>>;
}
