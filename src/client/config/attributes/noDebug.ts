import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'noDebug';
export const defaultValue = false;
export const validate = createBooleanValueValidator(attributeName, defaultValue);
