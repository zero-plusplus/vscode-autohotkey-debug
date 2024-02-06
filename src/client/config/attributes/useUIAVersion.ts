import { createBooleanValueValidator } from './common/boolean';

export const attributeName = 'useUIAVersion';
export const defaultValue = false;
export const validator = createBooleanValueValidator(attributeName, defaultValue);
