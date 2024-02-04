import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'noDebug';
export const defaultValue = false;
export const validator = createBooleanValueValidator(attributeName, defaultValue);
