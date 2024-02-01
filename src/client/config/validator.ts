import { deepDefaults } from '../../tools/utils';
import { AttributeValidator, DebugConfig, DebugConfigValidator, NormalizedDebugConfig } from '../../types/dap/config';
import { validateNameAttribute } from './attributes/name';
import { validateTypeAttribute } from './attributes/type';

const createAttributesValidator = (validators: AttributeValidator[]): DebugConfigValidator => {
  return async(config: DebugConfig, callback?: (err: Error) => void): Promise<NormalizedDebugConfig> => {
    const clonedConfig = deepDefaults({}, config);
    for await (const validate of validators) {
      try {
        await validate(clonedConfig);
      }
      catch (err: unknown) {
        if (err instanceof Error) {
          callback?.(err);
        }
      }
    }
    return clonedConfig as NormalizedDebugConfig;
  };
};

export const validateDebugConfig = createAttributesValidator([
  validateNameAttribute,
  validateTypeAttribute,
]);
