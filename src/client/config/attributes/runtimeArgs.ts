import { createStringArrayValueValidator } from './common/strings';

export const attributeName = 'runtimeArgs';
export const defaultValue = undefined;
export const validate = createStringArrayValueValidator(attributeName, defaultValue);
