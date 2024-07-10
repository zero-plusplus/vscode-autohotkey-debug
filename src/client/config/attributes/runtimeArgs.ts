import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { checkUtf8WithBomByFile } from '../../../tools/utils';

export const attributeName = 'runtimeArgs';
export const defaultValue: DebugConfig['runtimeArgs'] = [ '/ErrorStdOut' ];
export const defaultValueByUtf8WithBom: NormalizedDebugConfig['runtimeArgs'] = [ '/CP65001', '/ErrorStdOut=UTF-8' ];
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.isStringArray,
    [
      validators.expectUndefined(async() => {
        const program = checker.getDependency('program');
        if (await checkUtf8WithBomByFile(program)) {
          return defaultValueByUtf8WithBom;
        }
        return defaultValue;
      }),
      validators.expectStringArray((value: string[]) => value),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
