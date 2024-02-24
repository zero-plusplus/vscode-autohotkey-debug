import { AnnounceLevel } from '../../../types/dap/adapter.types';
import { AttributeValidator } from '../../../types/dap/config.types';

export const attributeName = 'useAnnounce';
export const defaultValue: AnnounceLevel = 'detail';
export const announceLevels: AnnounceLevel[] = [ 'error', 'detail', 'develop' ];
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

  if (typeof rawAttribute !== 'string') {
    checker.throwTypeError('string');
    return Promise.resolve();
  }

  if (announceLevels.includes(rawAttribute)) {
    checker.markValidated(rawAttribute);
    return Promise.resolve();
  }

  checker.throwValueError(announceLevels);
  return Promise.resolve();
};
