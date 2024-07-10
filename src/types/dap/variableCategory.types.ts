
/**
 * VariableCategory is a feature that displays a list of variables of interest to the user in the Variable View.
 * It can be viewed as a static watch expression, as it can display the results of expressions as well as variables.
 *
 * Common uses are to separate built-in global variables from user-defined global variables, or when you want to watch a specific variable such as `expected` or `actual`, for example in unit tests.
 *
 * You can also use conditional expressions to show/hide categories.
 * In the unit test example above, you can specify a condition that hides the category if the `UnitTest` class does not exist, thereby preventing categories you are not interested in from being displayed.
 */
import { LiteralUnion } from 'type-fest';
import { ContextName, contextNames } from '../dbgp/AutoHotkeyDebugger.types';

export type SourceName = ContextName;
export type SourceSelector = '*' | SourceName;
export type Expression = string;
export type VisibleCondition = boolean | Expression;
export interface VariableMatcher {
  pattern?: MatchPattern;
  attributes?: VariableAttributes;
}
export type PatternLiteral
  = VariablePrefixPatternLiteral
  | VariableSuffixxPatternLiteral
  | VariableExactPatternLiteral
  | VariableRegExPatternLiteral
  | VariableWildcardPatternLiteral;
export type VariablePrefixPatternLiteral = `>${string}>`;
export type VariableSuffixxPatternLiteral = `<${string}<`;
export type VariableExactPatternLiteral = `>${string}<`;
export type VariableRegExPatternLiteral = `/${string}/`;
export type VariableWildcardPatternLiteral = LiteralUnion<`|${string}|`, string>;

export type MatchPattern
  = PatternLiteral
  | VariableRegExPattern
  | VariablePrefixPattern
  | VariableSuffixPattern
  | VariableExactPattern
  | VariableWildcardPattern;
export type PatternType = 'partial' | 'prefix' | 'suffix' | 'exact' | 'regex' | 'regexp' | 'wildcard';
export interface VariablePatternBase {
  patternType: PatternType;
  pattern: string;
  ignorecase?: boolean;
}
export interface VariablePartialPattern extends VariablePatternBase {
  patternType: 'partial';
}
export interface VariablePrefixPattern extends VariablePatternBase {
  patternType: 'prefix';
}
export interface VariableSuffixPattern extends VariablePatternBase {
  patternType: 'suffix';
}
export interface VariableExactPattern extends VariablePatternBase {
  patternType: 'exact';
}
export interface VariableRegExPattern extends VariablePatternBase {
  patternType: 'regex' | 'regexp';
}
export interface VariableWildcardPattern extends VariablePatternBase {
  patternType: 'wildcard';
}
export interface VariableAttributes {
  type?: string;
  kindName?: string;
  isBuiltin?: boolean;
  isStatic?: boolean;
}

export const definedCategoryNames: readonly ['Local', 'Global', 'Static', 'Builtin-Global', 'UserDefined-Global'] = [
  ...contextNames,
  'Builtin-Global',
  'UserDefined-Global',
] as const;
export type DefinedCategoryName = typeof definedCategoryNames[number];
export interface VariableCategory {
  label: string;
  items: CategoryItem[];
  visible?: VisibleCondition;
  filters?: DefinedCategoryName | VariableMatcher[];
}
export type CategoryItem
  = VariableCategoryItem
  | ExpressionCategoryItem
  | CategoryItemSelector;
export interface CategoryItemBase {
  visible?: VisibleCondition;
}
export interface VariableCategoryItem extends CategoryItemBase {
  variableName: string;
  scope: SourceName;
}
export interface ExpressionCategoryItem extends CategoryItemBase {
  label: string;
  expression?: Expression;
}
export interface CategoryItemSelector extends CategoryItemBase {
  source: SourceSelector | SourceName[];
  select?: PatternLiteral | VariableMatcher;
}
