import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'useAutoJumpToError';
export const defaultValue = true;
export const validator = createBooleanValueValidator(attributeName, defaultValue);
