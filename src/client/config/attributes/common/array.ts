import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../../types/dap/config.types';

export const createArrayValueValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker: AttributeCheckerFactory): Promise<void> => {
    const checker = createChecker(attributeName);

    const rawAttribute = checker.get();
    if (rawAttribute === undefined) {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    if (!Array.isArray(rawAttribute)) {
      checker.throwTypeError('array');
      return Promise.resolve();
    }

    checker.markValidated(rawAttribute);
    return Promise.resolve();
  };
};
