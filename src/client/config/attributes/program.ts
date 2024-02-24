import { defaultAutoHotkeyRuntimePath_v1, defaultAutoHotkeyRuntimePath_v2 } from '../../../tools/autohotkey';
import { fileExists } from '../../../tools/predicate';
import { AttributeValidator } from '../../../types/dap/config.types';

export const attributeName = 'program';
export const defaultValue = fileExists(defaultAutoHotkeyRuntimePath_v2)
  ? defaultAutoHotkeyRuntimePath_v2
  : defaultAutoHotkeyRuntimePath_v1;
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawProgram = checker.get();
  if (rawProgram && typeof rawProgram !== 'string') {
    checker.throwTypeError('file path');
    return Promise.resolve();
  }

  const program = rawProgram ?? await checker.utils.getCurrentFile?.();
  if (!program) {
    checker.throwFileNotFoundError();
    return Promise.resolve();
  }

  if (!fileExists(program)) {
    checker.throwFileNotFoundError(program);
    return Promise.resolve();
  }

  checker.markValidatedPath(program);
  return Promise.resolve();
};
