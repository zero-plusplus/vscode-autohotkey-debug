import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';
import { BreakpointData, BreakpointDataArray, BreakpointDataGroup, BreakpointKind, ExceptionBreakpointData, FunctionBreakpointData, LineBreakpointData, LogpointData, ReturnBreakpointData } from '../../../types/tools/autohotkey/runtime/breakpoint.types';
import { VisibleCondition } from '../../../types/dap/variableCategory.types';
import { InterfaceRule } from '../../../types/tools/predicate.types';

export const attributeName = 'setBreakpoints';
export const defaultValue: DebugConfig['setBreakpoints'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    (value: any) => predicate.isUndefined(value) || isBreakpointDataArray(value),
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectArrayLiteral((value: any[]) => {
        const normalized: BreakpointDataArray = [];
        for (const [ index, element ] of Object.entries(value)) {
          if (isBreakpointData(element)) {
            normalized.push(element);
            continue;
          }
          checker.warning(`${attributeName}[${index}]`);
        }
        return normalized;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isBreakpointDataArray(value: any): value is BreakpointDataArray {
    if (!Array.isArray(value)) {
      return false;
    }

    for (const element of value) {
      if (!(isBreakpointData(element) || isBreakpointDataGroup(element))) {
        return false;
      }
    }
    return true;
  }
  function isBreakpointData(value: any): value is BreakpointData {
    if (isLineBreakpointData(value)) {
      return true;
    }
    if (isLogpointData(value)) {
      return true;
    }
    if (isFunctionBreakpointData(value)) {
      return true;
    }
    if (isReturnBreakpointData(value)) {
      return true;
    }
    if (isExceptionBreakpointData(value)) {
      return true;
    }
    return false;
  }
  function createBreakpointDataBaseInterfaceRule(): InterfaceRule {
    return {
      kind: (value: any): value is BreakpointKind => predicate.isString(value),
      hidden: (value: any): value is VisibleCondition => predicate.isBoolean(value) || predicate.isString(value),
      temporary: (value: any): value is boolean => predicate.isUndefined(value) || predicate.isBoolean(value),
      condition: (value: any): value is boolean => predicate.isUndefined(value) || predicate.isString(value),
      hitCondition: (value: any): value is boolean => predicate.isUndefined(value) || predicate.isString(value),
      logMessage: (value: any): value is boolean => predicate.isUndefined(value) || predicate.isString(value),
    };
  }
  function createNamedBreakpointDataBaseInterfaceRule(): InterfaceRule {
    return {
      ...createBreakpointDataBaseInterfaceRule(),
      name: predicate.isString,
    };
  }
  function isLineBreakpointData(value: any): value is LineBreakpointData {
    return predicate.isObject<LineBreakpointData>(value, {
      ...createBreakpointDataBaseInterfaceRule(),
      kind: (value: any): value is string => value === 'line',
    });
  }
  function isLogpointData(value: any): value is LogpointData {
    return predicate.isObject<LogpointData>(value, {
      ...createBreakpointDataBaseInterfaceRule(),
      kind: (value: any): value is string => value === 'log',
    });
  }
  function isFunctionBreakpointData(value: any): value is FunctionBreakpointData {
    return predicate.isObject<LogpointData>(value, {
      ...createNamedBreakpointDataBaseInterfaceRule(),
      kind: (value: any): value is string => value === 'function',
    });
  }
  function isReturnBreakpointData(value: any): value is ReturnBreakpointData {
    return predicate.isObject<LogpointData>(value, {
      ...createNamedBreakpointDataBaseInterfaceRule(),
      kind: (value: any): value is string => value === 'return',
    });
  }
  function isExceptionBreakpointData(value: any): value is ExceptionBreakpointData {
    return predicate.isObject<LogpointData>(value, {
      ...createNamedBreakpointDataBaseInterfaceRule(),
      kind: (value: any): value is string => value === 'exception',
    });
  }
  function isBreakpointDataGroup(value: any): value is BreakpointDataGroup {
    return predicate.isObject(value, {
      label: predicate.isString,
      breakpoints: (value: any): value is BreakpointData[] => predicate.isArray(value, isBreakpointData),
    });
  }
  // #endregion helpers
};
