import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { AttributeWarningError } from '../error';
import { contextNames } from '../../../types/dbgp/AutoHotkeyDebugger.types';
import { InterfaceRule } from '../../../types/tools/predicate.types';
import { CategoryItem, CategoryItemSelector, DefinedCategoryName, ExpressionCategoryItem, SourceName, SourceSelector, VariableAttributes, VariableCategory, VariableCategoryItem, VariableMatcher, VisibleCondition, definedCategoryNames } from '../../../types/dap/variableCategory.types';


export const attributeName = 'variableCategories';
export const defaultValue: DebugConfig['variableCategories'] = undefined;
export const normalizedDefaultValue: NormalizedDebugConfig['variableCategories'] = [
  {
    label: 'Local',
    items: [ { source: 'Local', select: { attributes: { isStatic: false } } } ],
  },
  {
    label: 'Static',
    items: [ { source: 'Static' } ],
  },
  {
    label: 'Static',
    items: [ { source: 'Local', select: { attributes: { isStatic: true } } } ],
  },
  {
    label: 'Global',
    items: [ { source: 'Global' } ],
    filters: [
      { pattern: '/\\d/' },
      { attributes: { isBuiltin: false } },
    ],
  },
  {
    label: 'Builtin-Global',
    items: [ { source: 'Global' } ],
    filters: [
      { pattern: '/\\d/' },
      { attributes: { isBuiltin: true } },
    ],
  },
];
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isVariableCategories,
    [
      validators.expectUndefined((value) => value),
      validators.expectBoolean((value) => (value ? normalizedDefaultValue : undefined)),
      validators.expectArrayLiteral((value) => value as NormalizedDebugConfig['variableCategories']),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isSourceName(value: any): value is SourceName {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return contextNames.includes(value);
  }
  function isSourceNames(value: any): value is SourceName[] {
    if (!predicate.isArrayLiteral(value)) {
      return false;
    }
    return value.every((childValue) => isSourceName(childValue));
  }
  function isSourceSelector(value: any): value is SourceSelector {
    return isSourceName(value) || value === '*';
  }
  function isDefinedCategoryName(value: any): value is DefinedCategoryName {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return isSourceName(value) || definedCategoryNames.includes(value);
  }
  function isVisibleCondition(value: any): value is VisibleCondition {
    return predicate.isBoolean(value) || predicate.isString(value);
  }

  function createCategoryItemBaseInterfaceRule(): InterfaceRule {
    return {
      visible: predicate.strictly((value: any) => predicate.isUndefined(value) || isVisibleCondition(value), new AttributeWarningError(attributeName, 'variableName', '')),
    };
  }
  function isVariableCategoryItem(value: any): value is VariableCategoryItem {
    return predicate.isObject(value, {
      ...createCategoryItemBaseInterfaceRule(),
      variableName: predicate.strictly(predicate.isString, new AttributeWarningError(attributeName, 'variableName', '')),
      scope: predicate.strictly(isSourceName, new AttributeWarningError(attributeName, 'scope', '')),
    });
  }
  function isExpressionCategoryItem(value: any): value is ExpressionCategoryItem {
    return predicate.isObject(value, {
      ...createCategoryItemBaseInterfaceRule(),
      label: predicate.strictly(predicate.isString, new AttributeWarningError(attributeName, 'label', '')),
      expression: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isString(value), new AttributeWarningError(attributeName, 'expression', '')),
    });
  }
  function isCategoryItemSelector(value: any): value is CategoryItemSelector {
    return predicate.isObject(value, {
      ...createCategoryItemBaseInterfaceRule(),
      source: predicate.strictly((value: any) => isSourceSelector(value) || isSourceNames(value), new AttributeWarningError(attributeName, 'expression', '')),
      select: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isString(value) || isVariableMatcher(value), new AttributeWarningError(attributeName, 'label', '')),
    });
  }
  function isCategoryItem(value: any): value is CategoryItem {
    if (isVariableCategoryItem(value)) {
      return true;
    }
    if (isExpressionCategoryItem(value)) {
      return true;
    }
    if (isCategoryItemSelector(value)) {
      return true;
    }
    return false;
  }
  function isCategoryItems(value: any): value is CategoryItem[] {
    if (!predicate.isArrayLiteral(value)) {
      return false;
    }
    return value.every((childValue) => isCategoryItem(childValue));
  }

  function isVariableAttributes(value: any): value is VariableAttributes {
    return predicate.isObject(value, {
      type: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isString(value), new AttributeWarningError(attributeName, 'type', '')),
      kindName: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isString(value), new AttributeWarningError(attributeName, 'kindName', '')),
      isBuiltin: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isBoolean(value), new AttributeWarningError(attributeName, 'isBuiltin', '')),
      isStatic: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isBoolean(value), new AttributeWarningError(attributeName, 'isStatic', '')),
    });
  }
  function isVariableMatcher(value: any): value is VariableMatcher {
    return predicate.isObject(value, {
      pattern: predicate.strictly((value: any) => predicate.isUndefined(value) || predicate.isString(value), new AttributeWarningError(attributeName, 'pattern', '')),
      attributes: predicate.strictly((value: any) => predicate.isUndefined(value) || isVariableAttributes(value), new AttributeWarningError(attributeName, 'attributes', '')),
    });
  }
  function isVariableMatchers(value: any): value is VariableMatcher[] {
    if (!predicate.isArrayLiteral(value)) {
      return false;
    }
    return value.every((childValue) => isVariableMatcher(childValue));
  }
  function isVariableCategory(value: any): value is VariableCategory {
    return predicate.isObject(value, {
      label: predicate.strictly(predicate.isString, new AttributeWarningError(attributeName, 'label', '')),
      items: predicate.strictly(isCategoryItems, new AttributeWarningError(attributeName, 'items', '')),
      visible: predicate.strictly((value: any) => predicate.isUndefined(value) || isVisibleCondition(value), new AttributeWarningError(attributeName, 'visible', '')),
      filters: predicate.strictly((value: any) => predicate.isUndefined(value) || isDefinedCategoryName(value) || isVariableMatchers(value), new AttributeWarningError(attributeName, 'filters', '')),
    });
  }
  function isVariableCategories(value: any): value is NormalizedDebugConfig['variableCategories'] {
    if (predicate.isUndefined(value)) {
      return true;
    }
    if (!predicate.isArrayLiteral(value)) {
      return false;
    }
    return value.every((childValue) => isVariableCategory(childValue));
  }
  // #endregion helpers
};
