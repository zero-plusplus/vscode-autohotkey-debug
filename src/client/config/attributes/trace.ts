import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'trace';
export const defaultValue = false;
export const validator = createBooleanValueValidator(attributeName, defaultValue);