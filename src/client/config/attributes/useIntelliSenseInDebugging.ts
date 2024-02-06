import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'useIntelliSenseInDebugging';
export const defaultValue = true;
export const validator = createBooleanValueValidator(attributeName, defaultValue);
