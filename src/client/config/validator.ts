/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as path from 'path';
import { deepDefaults } from '../../tools/utils';
import { AttributeChecker, AttributeCheckerFactoryUtils, AttributeValidator, DebugConfig, DebugConfigValidator, NormalizedDebugConfig } from '../../types/dap/config';
import { validateNameAttribute } from './attributes/name';
import { validateProgramAttribute } from './attributes/program';
import { validateRuntimeAttribute } from './attributes/runtime';
import { validateTypeAttribute } from './attributes/type';
import { AttributeFileNotFoundError, AttributeTypeError, AttributeValueError, AttributeWarningError, ValidationPriorityError } from './error';
import { validateRequestAttribute } from './attributes/request';

const createAttributeFactory = <K extends keyof DebugConfig>(config: DebugConfig, utils?: AttributeCheckerFactoryUtils): ((attributeName: K) => AttributeChecker<K>) => {
  const validated: Record<string, boolean> = {};
  return (attributeName: K): AttributeChecker<K> => {
    return {
      utils,
      rawConfig: config,
      get isValid() {
        return validated[attributeName];
      },
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config[attributeName];
      },
      ref(attributeName) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config[attributeName];
      },
      getDependency: <NK extends keyof NormalizedDebugConfig>(dependedAttributeName: NK): NormalizedDebugConfig[NK] => {
        if (!(dependedAttributeName in validated) || !validated[String(dependedAttributeName)]) {
          throw new ValidationPriorityError(config.name, String(attributeName), dependedAttributeName);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config[attributeName] as unknown as NormalizedDebugConfig[NK];
      },
      markValidated(value?): void {
        validated[String(attributeName)] = true;
        if (value && attributeName in config) {
          config[attributeName] = value;
        }
      },
      markValidatedPath(value?): void {
        validated[String(attributeName)] = true;
        if (value && attributeName in config) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          config[attributeName] = path.resolve(value) as any;
        }
      },
      throwWarningError(message): void {
        throw new AttributeWarningError(config.name, String(attributeName), message);
      },
      throwValueError(expectedValueOrValues): void {
        throw new AttributeValueError(config.name, String(attributeName), expectedValueOrValues);
      },
      throwTypeError(expectedTypeOrTypes): void {
        throw new AttributeTypeError(config.name, String(attributeName), expectedTypeOrTypes);
      },
      throwFileNotFoundError(filePath): void {
        throw new AttributeFileNotFoundError(config.name, String(attributeName), filePath);
      },
    };
  };
};
export const createAttributesValidator = (validators: AttributeValidator[], utils?: AttributeCheckerFactoryUtils): DebugConfigValidator => {
  return async(config: DebugConfig, callback?: (err: Error) => void): Promise<NormalizedDebugConfig> => {
    const clonedConfig = deepDefaults({}, config);

    const createChecker = createAttributeFactory(clonedConfig, utils);
    for await (const validate of validators) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await validate(createChecker as any);
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
  validateRequestAttribute,

  validateProgramAttribute,
  validateRuntimeAttribute,
]);
