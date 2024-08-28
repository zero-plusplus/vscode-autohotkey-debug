import { Schema } from '../../types/tools/validator/schema.types';
import { AttributeRule, RuleToNormalized } from '../../types/tools/validator/rules.types';
import { NormalizationWarning, SchemaValidationError, ValidationWarning } from './error';
import { OnError } from 'type-fest';

const defaultOnError: OnError = (err: unknown): void => {
  if (err instanceof ValidationWarning || err instanceof NormalizationWarning) {
    console.log(err.message);
  }
  else if (err instanceof Error) {
    throw err;
  }
};
export function createSchema<Rule extends AttributeRule<any>>(rule: Rule, onError: OnError = defaultOnError): Schema<Rule> {
  return {
    async validate(value): Promise<boolean> {
      return new Promise((resolve) => {
        resolve(rule.config.validator(value, onError));
      });
    },
    async normalize<Value>(value: Value): Promise<RuleToNormalized<Rule> | Value> {
      return rule.config.normalizer(value, onError) as Promise<RuleToNormalized<Rule>> | Value;
    },
    async apply(value): Promise<RuleToNormalized<Rule>> {
      const normalized = await this.normalize(value);
      if (await this.validate(normalized)) {
        return Promise.resolve(normalized);
      }
      throw new SchemaValidationError(value);
    },
  };
}
