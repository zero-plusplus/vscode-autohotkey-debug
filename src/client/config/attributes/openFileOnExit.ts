import { createStringValueValidator } from './common/string';

export const attributeName = 'openFileOnExit';
export const defaultValue = undefined;
export const validator = createStringValueValidator(attributeName, defaultValue);
