import { Validator } from '../../types/tools/validator/common.types';
import { ValidatorRuleBase } from '../../types/tools/validator/validators.types';
import { ValidationError } from './error';

export function createSchema<R>(rule: ValidatorRuleBase<R>): Validator<R> {
  return async<V>(value: V): Promise<R> => {
    const normalized = await rule.__normalizer(value) as V | R;
    if (rule.validator(normalized)) {
      return Promise.resolve(normalized);
    }
    throw new ValidationError(value);
  };
}
