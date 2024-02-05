import { createFilePathValidator } from './common/file';

export const attributeName = 'openFileOnExit';
export const defaultValue = undefined;
export const validator = createFilePathValidator(attributeName, defaultValue);
