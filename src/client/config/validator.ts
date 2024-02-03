/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as path from 'path';
import { deepDefaults } from '../../tools/utils';
import { AttributeChecker, AttributeCheckerFactoryUtils, AttributeValidator, DebugConfig, DebugConfigValidator, NormalizedDebugConfig } from '../../types/dap/config';
import * as attributes from './attributes';
import { AttributeFileNotFoundError, AttributeFormatError, AttributeTypeError, AttributeValueError, AttributeWarningError, ValidationPriorityError } from './error';

const createAttributeFactory = <K extends keyof DebugConfig>(config: DebugConfig, utils: AttributeCheckerFactoryUtils = {}): ((attributeName: K) => AttributeChecker<K>) => {
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
      warning(message): void {
        const warning = new AttributeWarningError(config.name, String(attributeName), message);
        if (this.utils.warning) {
          this.utils.warning(warning.message);
          return;
        }
        throw warning;
      },
      throwFormatError(format: string): void {
        throw new AttributeFormatError(config.name, String(attributeName), format);
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

export const createAttributesValidator = (validators: AttributeValidator[], utils: AttributeCheckerFactoryUtils = {}): DebugConfigValidator => {
  const defaultErrorHandler = (err: Error): void => {
    throw err;
  };
  return async(config: DebugConfig, errorHandler?: (err: Error) => void): Promise<NormalizedDebugConfig> => {
    const clonedConfig = deepDefaults({}, config);

    const createChecker = createAttributeFactory(clonedConfig, utils);
    for await (const validate of validators) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await validate(createChecker as any);
      }
      catch (err: unknown) {
        if (err instanceof Error) {
          (errorHandler ?? defaultErrorHandler)(err);
        }
      }
    }
    return clonedConfig as NormalizedDebugConfig;
  };
};

export const validateDebugConfig = createAttributesValidator([
  attributes.name.validate,
  attributes.type.validate,
  attributes.request.validate,
  attributes.stopOnEntry.validate,
  attributes.args.validate,
  attributes.port.validate,
  attributes.hostname.validate,
  attributes.skipFunctions.validate,
  attributes.skipFiles.validate,

  attributes.program.validate,
  attributes.runtime.validate,
]);
