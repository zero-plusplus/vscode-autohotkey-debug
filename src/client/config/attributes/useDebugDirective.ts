import { deepDefaults } from '../../../tools/utils';
import { DebugDirectiveConfig } from '../../../types/client/config/attributes/useDebugDirective.types';
import { AttributeValidator } from '../../../types/dap/config.types';

export const attributeName = 'useDebugDirective';
export const defaultValue = false;
export const normalizeDefaultValue: DebugDirectiveConfig = {
  useBreakpointDirective: true,
  useClearConsoleDirective: true,
  useOutputDirective: true,
};
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawAttribute = checker.get();
  if (rawAttribute === undefined || rawAttribute === false) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (rawAttribute === true) {
    checker.markValidated(normalizeDefaultValue);
    return Promise.resolve();
  }

  if (typeof rawAttribute !== 'object' || Array.isArray(rawAttribute)) {
    checker.throwTypeError([ 'boolean', 'object' ]);
    return Promise.resolve();
  }

  checker.markValidated(deepDefaults(rawAttribute, normalizeDefaultValue));
  return Promise.resolve();
};
