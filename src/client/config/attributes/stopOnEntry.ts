import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'stopOnEntry';
export const defaultValue = false;
export const validator = createBooleanValueValidator(attributeName, defaultValue);
