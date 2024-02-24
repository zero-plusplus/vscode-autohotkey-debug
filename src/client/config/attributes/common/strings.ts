import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../../types/dap/config.types';

export const createStringArrayValueValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker: AttributeCheckerFactory): Promise<void> => {
    const checker = createChecker(attributeName);

    const rawAttribute = checker.get();
    if (rawAttribute === undefined) {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    if (!Array.isArray(rawAttribute)) {
      checker.throwTypeError('string[]');
      return Promise.resolve();
    }

    const attribute = (rawAttribute as string[]).filter((value, index) => {
      if (typeof value === 'string') {
        return true;
      }

      checker.warning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`);
      return false;
    });
    checker.markValidated(attribute as typeof defaultValue);
    return Promise.resolve();
  };
};
