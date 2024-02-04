import { createStringArrayValueValidator } from './common/strings';

export const attributeName = 'runtimeArgs';
export const defaultValue: string[] = [];
export const validate = createStringArrayValueValidator(attributeName, defaultValue);
