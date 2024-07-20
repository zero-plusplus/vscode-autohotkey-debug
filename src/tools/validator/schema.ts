import { Schema } from '../../types/tools/validator/schema.types';
import { ValidatorRule } from '../../types/tools/validator/rules.types';
import { ValidationError } from './error';

export function createSchema<Rule extends ValidatorRule<any>>(rule: Rule): (Schema<Rule>) {
  return async(value): ReturnType<Schema<Rule>> => {
    const normalized = await rule.__normalizer(value) as ReturnType<Schema<Rule>>;
    if (rule.validator(normalized)) {
      return Promise.resolve(normalized);
    }
    throw new ValidationError(value);
  };
}
