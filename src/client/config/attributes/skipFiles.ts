import { createStringArrayValueValidator } from './common/strings';

export const attributeName = 'skipFiles';
export const defaultValue = undefined;
export const validator = createStringArrayValueValidator(attributeName, defaultValue);