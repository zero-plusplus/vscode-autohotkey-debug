import { AttributeValidator } from '../../../types/dap/config';
import { AttributeValueError, AttributeWarningError } from '../error';

export const attributeName = 'type';
export const defaultValue = 'autohotkey';
export const validateTypeAttribute: AttributeValidator = async(config): Promise<void> => {
  if (typeof config.type !== 'string') {
    throw new AttributeValueError(attributeName, defaultValue);
  }

  if (config.type === defaultValue) {
    return Promise.resolve();
  }

  config.type = defaultValue;
  throw new AttributeWarningError(attributeName, `The ${attributeName} attribute must be "${defaultValue}".`);
};
