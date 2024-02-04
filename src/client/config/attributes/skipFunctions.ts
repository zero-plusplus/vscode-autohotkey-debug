import { createStringArrayValueValidator } from './common/strings';

export const attributeName = 'skipFunctions';
export const defaultValue = undefined;
export const validator = createStringArrayValueValidator(attributeName, defaultValue);
