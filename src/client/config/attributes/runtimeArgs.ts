import { checkUtf8WithBomByFile } from '../../../tools/utils/checkUtf8WithBom';
import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config.types';

export const attributeName = 'runtimeArgs';
export const defaultValue = [ '/ErrorStdOut' ];
export const defaultValueByUtf8WithBom = [ '/CP65001', '/ErrorStdOut=UTF-8' ];
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawAttribute = checker.get();
  if (rawAttribute === undefined) {
    const program = checker.getDependency('program');
    if (await checkUtf8WithBomByFile(program)) {
      checker.markValidated(defaultValueByUtf8WithBom);
      return Promise.resolve();
    }
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (!Array.isArray(rawAttribute)) {
    checker.throwTypeError('string[]');
    return Promise.resolve();
  }

  const attribute = (rawAttribute).filter((value, index) => {
    if (typeof value === 'string') {
      return true;
    }

    checker.warning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`);
    return false;
  });
  checker.markValidated(attribute);
  return Promise.resolve();
};
