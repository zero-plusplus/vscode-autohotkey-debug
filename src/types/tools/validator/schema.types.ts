import { SimplifyDeep } from 'type-fest/source/merge-deep';
import { PickResult, ValidatorRuleBase } from './rules.types';

export type Schema<Rule extends ValidatorRuleBase<any>> = (value: any) => Promise<SimplifyDeep<PickResult<Rule>>>;