import { DebugDirectiveConfig } from '../../../types/dap/adapter';
import { AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'useDebugDirective';
export const defaultValue = false;
export const recommendValue: DebugDirectiveConfig = {
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
    checker.markValidated(recommendValue);
    return Promise.resolve();
  }

  if (typeof rawAttribute !== 'object' || Array.isArray(rawAttribute)) {
    checker.throwTypeError([ 'boolean', 'object' ]);
    return Promise.resolve();
  }

  checker.markValidated(rawAttribute);
  return Promise.resolve();
};
