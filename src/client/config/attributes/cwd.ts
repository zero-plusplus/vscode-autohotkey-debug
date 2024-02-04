import { createStringValueValidator } from './common/string';

export const attributeName = 'cwd';
export const defaultValue = undefined;
export const validator = createStringValueValidator(attributeName, defaultValue);
