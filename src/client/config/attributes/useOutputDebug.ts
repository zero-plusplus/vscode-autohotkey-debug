import { deepDefaults } from '../../../tools/utils';
import { OutputDebugConfig } from '../../../types/dap/adapter';
import { AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'useOutputDebug';
export const defaultValue: OutputDebugConfig = {
  category: 'stderr',
  useTrailingLinebreak: false,
};
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawAttribute = checker.get();
  if (rawAttribute === undefined || rawAttribute === false) {
    checker.markValidated(false);
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
