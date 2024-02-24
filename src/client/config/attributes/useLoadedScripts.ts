import { deepDefaults } from '../../../tools/utils';
import { AttributeValidator } from '../../../types/dap/config.types';
import { LoadedScriptsConfig } from '../../../types/dap/loadedScripts.types';

export const attributeName = 'useLoadedScripts';
export const defaultValue: LoadedScriptsConfig = {
  scanImplicitLibrary: true,
};
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawAttribute = checker.get();
  if (rawAttribute === undefined || rawAttribute === false) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (rawAttribute === true) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }

  if (typeof rawAttribute !== 'object' || Array.isArray(rawAttribute)) {
    checker.throwTypeError([ 'boolean', 'object' ]);
    return Promise.resolve();
  }

  checker.markValidated(deepDefaults(rawAttribute, defaultValue));
  return Promise.resolve();
};
