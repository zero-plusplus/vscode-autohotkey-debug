import { createArrayValueValidator } from './common/array';

export const attributeName = 'setBreakpoints';
export const defaultValue = undefined;
export const validator = createArrayValueValidator(attributeName, defaultValue);
