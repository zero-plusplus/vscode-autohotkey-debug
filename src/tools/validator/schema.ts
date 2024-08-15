import { Schema } from '../../types/tools/validator/schema.types';
import { AttributeRule, OnError } from '../../types/tools/validator/rules.types';
import { SchemaValidationError } from './error';

export function createSchema<Rule extends AttributeRule<any>>(rule: Rule, onError?: OnError): Schema<Rule> {
  return async(value): ReturnType<Schema<Rule>> => {
    try {
      if (rule.config.validator(value)) {
        return value as ReturnType<Schema<Rule>>;
      }
    }
    catch {
    }

    const normalized = await rule.config.normalizer(value, onError) as ReturnType<Schema<Rule>>;
    if (rule.config.validator(normalized, onError)) {
      return Promise.resolve(normalized);
    }
    throw new SchemaValidationError(value);
  };
}
