import { fileExists } from '../../../../tools/predicate';
import { AttributeValidator, DebugConfig } from '../../../../types/dap/config.types';

export const createFilePathValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker): Promise<void> => {
    const checker = createChecker(attributeName);

    const rawAttribute = checker.get();
    if (rawAttribute === undefined) {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    if (typeof rawAttribute !== 'string') {
      checker.throwTypeError('file path');
      return Promise.resolve();
    }

    if (!fileExists(rawAttribute)) {
      checker.throwFileNotFoundError(rawAttribute);
      return Promise.resolve();
    }

    checker.markValidatedPath(rawAttribute);
    return Promise.resolve();
  };
};
