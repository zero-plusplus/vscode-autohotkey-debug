import { PickResult, ValidatorRule } from './validators.types';

export type Schema<Rule extends ValidatorRule<any>> = (value: any) => Promise<PickResult<Rule>>;
