import { createStringArrayValueValidator } from './common/strings';

export const attributeName = 'args';
export const defaultValue = undefined;
export const validate = createStringArrayValueValidator(attributeName, defaultValue);
