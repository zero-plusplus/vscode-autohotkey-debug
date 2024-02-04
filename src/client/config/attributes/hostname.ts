import { createStringValueValidator } from './common/string';

export const attributeName = 'hostname';
export const defaultValue = 'localhost';
export const validator = createStringValueValidator(attributeName, defaultValue);
