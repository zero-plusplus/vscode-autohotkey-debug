import { createStringValueValidator } from './common/string';

export const attributeName = 'name';
export const defaultValue = 'AutoHotkey Debug';
export const validator = createStringValueValidator(attributeName, defaultValue);
