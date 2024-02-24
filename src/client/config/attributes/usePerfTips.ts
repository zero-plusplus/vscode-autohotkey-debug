import { AttributeValidator } from '../../../types/dap/config.types';
import { PerfTipsConfig } from '../../../types/dap/perftips.types.';

export const attributeName = 'usePerfTips';
export const defaultValue = false;
export const recommendValue: PerfTipsConfig = {
  fontColor: 'gray',
  fontStyle: 'italic',
  format: '{<$elapsedTime_s>}s elapsed',
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
    checker.throwTypeError('object');
    return Promise.resolve();
  }

  checker.markValidated(rawAttribute);
  return Promise.resolve();
};
