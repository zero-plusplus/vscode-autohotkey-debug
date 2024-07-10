/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as path from 'path';
import { deepDefaults } from '../../tools/utils';
import * as attributes from './attributes';
import { AttributeChecker, AttributeCheckerFactory, AttributeCheckerFactoryUtils, AttributeValidator, DebugConfig, DebugConfigValidator, NormalizedDebugConfig } from '../../types/dap/config.types';
import { AttributeFileNotFoundError, AttributeFormatError, AttributeTypeError, AttributeValueError, AttributeWarningError, ValidationPriorityError } from './error';
import { NormalizationError, ValidationError } from '../../tools/validator/error';

const createAttributeCheckerFactory = <K extends keyof DebugConfig>(config: DebugConfig, utils: AttributeCheckerFactoryUtils = {}): ((attributeName: K) => AttributeChecker<K>) => {
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
      getByName(attributeName) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config[attributeName];
      },
      getDependency: <NK extends keyof NormalizedDebugConfig>(dependedAttributeName: NK): NormalizedDebugConfig[NK] => {
        if (!(dependedAttributeName in validated) || !validated[String(dependedAttributeName)]) {
          throw new ValidationPriorityError(config.name, String(attributeName), dependedAttributeName);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return config[dependedAttributeName] as unknown as NormalizedDebugConfig[NK];
      },
      markValidated(value?): void {
        validated[String(attributeName)] = true;
        if (value !== undefined) {
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
  return async(config: DebugConfig, errorHandler?: (err: Error) => void): Promise<NormalizedDebugConfig> => {
    const clonedConfig = deepDefaults({}, config) as DebugConfig;

    const createChecker: AttributeCheckerFactory = createAttributeCheckerFactory(clonedConfig, utils);
    for await (const validate of validators) {
      try {
        await validate(createChecker);
      }
      catch (err: unknown) {
        if (err instanceof ValidationError) {
          continue;
        }
        if (err instanceof NormalizationError) {
          await utils.warning?.(err.message);
          continue;
        }

        if (err instanceof Error) {
          if (utils.error) {
            await utils.error(err);
            continue;
          }
          throw err;
        }
      }
    }
    return clonedConfig as NormalizedDebugConfig;
  };
};

export const validateDebugConfig: DebugConfigValidator = createAttributesValidator([
  attributes.name.validator,
  attributes.type.validator,
  attributes.request.validator,
  attributes.stopOnEntry.validator,
  attributes.args.validator,
  attributes.port.validator,
  attributes.hostname.validator,
  attributes.skipFunctions.validator,
  attributes.skipFiles.validator,
  attributes.skipFiles.validator,
  attributes.trace.validator,
  attributes.noDebug.validator,
  attributes.cwd.validator,
  attributes.env.validator,
  attributes.openFileOnExit.validator,
  attributes.variableCategories.validator,
  attributes.setBreakpoints.validator,
  attributes.usePerfTips.validator,
  attributes.useIntelliSenseInDebugging.validator,
  attributes.useDebugDirective.validator,
  attributes.useOutputDebug.validator,
  attributes.useAutoJumpToError.validator,
  attributes.useAnnounce.validator,
  attributes.useLoadedScripts.validator,
  attributes.useUIAVersion.validator,

  attributes.program.validator,
  attributes.runtime.validator,
  attributes.runtimeArgs.validator,
]);
