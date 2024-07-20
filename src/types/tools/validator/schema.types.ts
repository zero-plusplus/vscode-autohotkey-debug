import { SimplifyDeep } from 'type-fest/source/merge-deep';
import { PickResult, ValidatorRule } from './rules.types';

export type Schema<Rule extends ValidatorRule<any>> = (value: any) => Promise<SimplifyDeep<PickResult<Rule>>>;
