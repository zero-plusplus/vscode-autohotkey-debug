import * as path from 'path';
import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';

export const attributeName = 'program';
export const defaultValue: DebugConfig['program'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const validate = validators.createValidator(
    predicate.fileExists,
    checker.throwFileNotFoundError,
    [
      validators.expectUndefined(async() => {
        // Case 1: If the editor can provide an open file
        if (checker.utils.getCurrentFile) {
          const currentFile = await checker.utils.getCurrentFile();
          if (currentFile) {
            return currentFile;
          }
        }

        // Case 2: [Default file name](https://www.autohotkey.com/docs/v2/Scripts.htm#defaultfile)
        // Only if the appropriate `runtime` is set before validation
        const runtime = checker.getByName('runtime');
        if (runtime && predicate.fileExists(runtime)) {
          const fileName = `${path.basename(runtime, path.extname(runtime))}.ahk`;
          const program = path.resolve(runtime, fileName);
          return program;
        }
        return '';
      }),
      validators.expectString((value) => value),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
