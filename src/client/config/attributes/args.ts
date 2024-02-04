import { createStringArrayValueValidator } from './common/strings';

export const attributeName = 'args';
export const defaultValue: string[] = [];
export const validator = createStringArrayValueValidator(attributeName, defaultValue);
