import { AttributeValidator } from '../../../types/dap/config';
import { AttributeTypeError } from '../error';

export const attributeName = 'name';
export const defaultValue = 'AutoHotkey Debug';
export const validateNameAttribute: AttributeValidator = async(config): Promise<void> => {
  if (!(attributeName in config) || config.name === undefined) {
    config.name = defaultValue;
    return Promise.resolve();
  }
  if (typeof config.name === 'string') {
    return Promise.resolve();
  }
  throw new AttributeTypeError(attributeName, 'string');
};
