import { getContext, getEnumerableProperties, getNonEnumerableProperties, getProperty, getPropertyCount, getPropertyLength, getPropertyNumberOfChildren, isObjectProperty, isObjectPropertyLike, isPrimitivePropertyLike, reloadObjectProperty } from '../../tools/autohotkey/runtime/context';
import { ObjectPropertyLike, PrimitivePropertyLike, PropertyLike } from '../../types/tools/autohotkey/runtime/context.types';
import { Session } from '../../types/dbgp/session.types';
import { isArrayIndexName, isSpecialName, toJsStringByAhkString } from '../../dbgp/utils';
import { VariablesReferenceManager } from '../../types/dap/adapter/utils.types';
import { DapScope, DapVariable } from '../../types/dap/types';
import { ParsedAutoHotkeyVersion } from '../../types/tools/autohotkey/version/common.types';

export type VariablesReferenceBuilder = (property: PropertyLike) => number;
export type DapVariableConverter = (property: PropertyLike) => Promise<DapVariable>;

// #region variable builders
const maxDepth = 2;
export async function createVariablesByScope(session: Session, variablesReferenceManager: VariablesReferenceManager, scope: DapScope, maxChildren: number): Promise<DapVariable[]> {
  const context = await getContext(session, scope.contextId, scope.stackLevel, maxDepth - 1, maxChildren);
  return propertiesToVariables(context.properties, createConverter(session, variablesReferenceManager));
}
export async function createIndexedVariablesByVariable(session: Session, variablesReferenceManager: VariablesReferenceManager, variable: DapVariable, maxChildren: number, page?: number): Promise<DapVariable[]> {
  if (!variable.evaluateName) {
    return [];
  }
  if (variable.contextId === -1) {
    return [];
  }

  if (variable.pagingKind === 'all') {
    const property = await getProperty(session, variable.evaluateName, variable.contextId, variable.stackLevel, maxDepth, maxChildren, page);
    if (isObjectProperty(property)) {
      return propertiesToVariables(property.children, createConverter(session, variablesReferenceManager));
    }
    return [];
  }

  const properties = await getEnumerableProperties(session, variable.evaluateName, variable.contextId, variable.stackLevel, maxDepth, maxChildren, page);
  return propertiesToVariables(properties, createConverter(session, variablesReferenceManager));
}
export async function createNamedVariablesByVariable(session: Session, variablesReferenceManager: VariablesReferenceManager, variable: DapVariable, maxChildren: number): Promise<DapVariable[]> {
  if (variable.contextId === -1) {
    return [];
  }
  if (!variable.evaluateName) {
    return [];
  }
  if (variable.pagingKind === 'all') {
    if (variable.nonEnumerableCount && maxChildren < variable.nonEnumerableCount) {
      return [];
    }
  }

  const properties = await getNonEnumerableProperties(session, variable.evaluateName, variable.contextId, variable.stackLevel, 2, variable.nonEnumerableCount);
  return propertiesToVariables(properties, createConverter(session, variablesReferenceManager));
}
export async function createVariablesByVariable(session: Session, variablesReferenceManager: VariablesReferenceManager, variable: DapVariable, maxChildren: number, page?: number): Promise<DapVariable[]> {
  if (variable.contextId === -1) {
    return [];
  }
  if (variable.evaluateName === undefined || variable.evaluateName === '') {
    return [];
  }

  const property = await getProperty(session, variable.evaluateName, variable.contextId, variable.stackLevel, maxDepth, maxChildren, page);
  if (isObjectProperty(property)) {
    return propertiesToVariables(property.children, createConverter(session, variablesReferenceManager));
  }
  return [];
}
// #region variable builders

// #region converter
export async function propertiesToVariables(sourceProperty: PropertyLike | PropertyLike[] | undefined, converter: DapVariableConverter): Promise<DapVariable[]> {
  if (sourceProperty === undefined) {
    return [];
  }
  const properties = Array.isArray(sourceProperty) ? sourceProperty : [ sourceProperty ];

  const variables: DapVariable[] = [];
  for await (const property of properties) {
    const variable = await converter(property);
    variables.push(variable);
  }
  return variables;
}
export async function propertyToVariable(sourceProperty: PropertyLike, converter: DapVariableConverter): Promise<DapVariable> {
  const variable = await converter(sourceProperty);
  return variable;
}
export function createConverter(session: Session, variablesReferenceManager: VariablesReferenceManager): DapVariableConverter {
  return async(property: PropertyLike): Promise<DapVariable> => {
    if (2.0 <= session.ahkVersion.mejor) {
      return converterForLatest(session, variablesReferenceManager, property);
    }
    return converterForV1_X(session, variablesReferenceManager, property);
  };
}
export async function converterForLatest(session: Session, variablesReferenceManager: VariablesReferenceManager, property: PropertyLike): Promise<DapVariable> {
  if (isPrimitivePropertyLike(property)) {
    return toVariableByPrimitiveProperty(session.ahkVersion, property);
  }

  const nonEnumerableCount = await getPropertyNumberOfChildren(session, property);
  const namedVariables = nonEnumerableCount;

  let pagingKind: DapVariable['pagingKind'] | undefined;
  let enumerableCount: number;
  let numberOfChildren: number;
  let indexedVariables: number | undefined;
  const variablesReference = variablesReferenceManager.createVariablesReference();
  switch (property.className) {
    case 'Array': {
      pagingKind = 'array';
      enumerableCount = await getPropertyLength(session, property);
      if (enumerableCount) {
        indexedVariables = enumerableCount;
      }
      numberOfChildren = enumerableCount + nonEnumerableCount;
      break;
    }
    case 'Map': {
      pagingKind = 'map';
      enumerableCount = await getPropertyCount(session, property);
      if (enumerableCount) {
        indexedVariables = enumerableCount;
      }
      numberOfChildren = enumerableCount + nonEnumerableCount;
      break;
    }
    default: {
      pagingKind = 'all';
      enumerableCount = 0;
      numberOfChildren = nonEnumerableCount;
      if (0 < numberOfChildren && property.pageSize < numberOfChildren) {
        indexedVariables = enumerableCount;
      }
      break;
    }
  }

  const property_preview = isObjectProperty(property) && property.children === undefined
    ? await reloadObjectProperty(session, property, 1, 5, 0)
    : property;
  const valueOrObjectPreview = toValueByObjectProperty(session.ahkVersion, property_preview ?? property, enumerableCount, nonEnumerableCount, pagingKind);

  return {
    variablesReference,
    name: property.name,
    evaluateName: property.fullName,
    contextId: property.contextId,
    stackLevel: property.stackLevel,
    value: valueOrObjectPreview,
    enumerableCount,
    nonEnumerableCount,
    numberOfChildren,
    indexedVariables,
    namedVariables,
    pagingKind,
  };
}
export async function converterForV1_X(session: Session, variablesReferenceManager: VariablesReferenceManager, property: PropertyLike): Promise<DapVariable> {
  if (isPrimitivePropertyLike(property)) {
    return toVariableByPrimitiveProperty(session.ahkVersion, property);
  }
  const numberOfChildren = await getPropertyNumberOfChildren(session, property);

  let pagingKind: DapVariable['pagingKind'] | undefined;
  let enumerableCount: number;
  let nonEnumerableCount: number;
  let indexedVariables: number | undefined;
  const variablesReference = variablesReferenceManager.createVariablesReference();
  switch (property.className) {
    case 'Object': {
      pagingKind = 'all';
      enumerableCount = await getPropertyLength(session, property);
      if (0 < enumerableCount) {
        pagingKind = 'array';
        indexedVariables = enumerableCount;
      }
      nonEnumerableCount = numberOfChildren - enumerableCount;
      break;
    }
    default: {
      pagingKind = 'all';
      enumerableCount = 0;
      nonEnumerableCount = numberOfChildren;
      if (0 < enumerableCount && property.pageSize < enumerableCount) {
        indexedVariables = enumerableCount;
      }
      break;
    }
  }

  return {
    variablesReference,
    name: property.name,
    evaluateName: property.fullName,
    contextId: property.contextId,
    stackLevel: property.stackLevel,
    value: toValueByProperty(session.ahkVersion, property, enumerableCount, nonEnumerableCount, pagingKind),
    enumerableCount,
    nonEnumerableCount,
    numberOfChildren,
    indexedVariables,
    namedVariables: 1, // The debugger cannot retrieve the specified number of non-enumerable elements, so it must always specify 1 and search for non-enumerated elements in the variablesRequest
    pagingKind,
  };
}
export function toVariableByPrimitiveProperty(ahkVersion: ParsedAutoHotkeyVersion, property: PrimitivePropertyLike): DapVariable {
  return {
    contextId: property.contextId,
    type: property.type,
    name: property.name,
    evaluateName: property.fullName,
    stackLevel: property.stackLevel,
    value: toValueByPrimitiveProperty(ahkVersion, property),
    pagingKind: 'none',
    variablesReference: 0,
  };
}
// #endregion converter

// #region value and object preview builders
const ellipsisChars = '…';
const getPreviewChildren = (property: ObjectPropertyLike, filter: (property: PropertyLike) => boolean, displayCount = 5): PropertyLike[] => {
  if (property.children === undefined) {
    return [];
  }

  const tryLimit = 50;
  const previewProperties: PropertyLike[] = [];

  const startIndexWithoutPseudoVariable = property.children.findIndex(((child) => !isSpecialName(child.name)));
  if (startIndexWithoutPseudoVariable === -1) {
    return [];
  }

  for (let i = startIndexWithoutPseudoVariable; i < property.children.length; i++) {
    if (tryLimit < i) {
      break;
    }
    if (displayCount <= previewProperties.length) {
      break;
    }

    const child = property.children[i];
    if (filter(child)) {
      previewProperties.push(child);
    }
  }
  return previewProperties;
};
export function toValueByProperty(ahkVersion: ParsedAutoHotkeyVersion, property: PropertyLike, enumerableCount?: number, nonEnumerableCount?: number, pagingKind?: DapVariable['pagingKind'], __root = true): string {
  return isObjectPropertyLike(property)
    ? toValueByObjectProperty(ahkVersion, property, enumerableCount, nonEnumerableCount, pagingKind, __root)
    : toValueByPrimitiveProperty(ahkVersion, property);
}
export function toValueByPrimitiveProperty(ahkVersion: ParsedAutoHotkeyVersion, property: PrimitivePropertyLike): string {
  switch (property.type) {
    case 'string': return `"${toJsStringByAhkString(ahkVersion, property.value)}"`;
    case 'integer':
    case 'float': return property.value;
    default: break;
  }
  return 'Not initialized';
}
export function toValueByObjectProperty(ahkVersion: ParsedAutoHotkeyVersion, property: ObjectPropertyLike, enumerableCount?: number, nonEnumerableCount?: number, pagingKind?: DapVariable['pagingKind'], __root = true): string {
  if (property.className === 'Prototype') {
    return toValueByPrototypeProperty(ahkVersion, property, __root);
  }
  if (property.className === 'Class') {
    return toValueByClassProperty(ahkVersion, property, __root);
  }

  if (pagingKind === 'array' && enumerableCount) {
    return toValueByArrayLikeProperty(ahkVersion, property, enumerableCount, __root);
  }
  if (2.0 <= ahkVersion.mejor) {
    if (property.className === 'Func' || property.className === 'Closure') {
      return toValueByCallableProperty(property, __root);
    }
    if (pagingKind === 'map' && enumerableCount) {
      return toValueByMapLikeProperty(ahkVersion, property, enumerableCount, __root);
    }
  }
  if (property.children === undefined) {
    return property.className;
  }
  return toValueByRecordLikeProperty(ahkVersion, property, nonEnumerableCount, __root);
}
export function toValueByRecordLikeProperty(ahkVersion: ParsedAutoHotkeyVersion, property: ObjectPropertyLike, count?: number, __root = true): string {
  if (!__root) {
    return property.className;
  }

  const samples = getPreviewChildren(property, (child) => !([ '__', '<' ].some((prefix) => child.name.startsWith(prefix))))
    .map((child) => `${child.name}: ${toValueByProperty(ahkVersion, child, 0, 0, 'none', false)}`);
  if (count && samples.length < count) {
    samples.push(ellipsisChars);
  }
  return `${property.className} {${samples.join(', ')}}`;
}
export function toValueByMapLikeProperty(ahkVersion: ParsedAutoHotkeyVersion, property: ObjectPropertyLike, enumerableCount: number, __root = true): string {
  if (!__root) {
    return property.className;
  }

  const samples = getPreviewChildren(property, (child) => !([ '__', '<' ].some((prefix) => child.name.startsWith(prefix))))
    .map((child) => `${child.name} => ${toValueByProperty(ahkVersion, child, 0, 0, 'none', false)}`);
  if (enumerableCount && samples.length < enumerableCount) {
    samples.push(ellipsisChars);
  }
  return `${property.className} {${samples.join(', ')}}`;
}
export function toValueByArrayLikeProperty(ahkVersion: ParsedAutoHotkeyVersion, property: ObjectPropertyLike, enumerableCount: number, __root = true): string {
  if (!__root) {
    return property.className;
  }

  const samples = getPreviewChildren(property, (child) => isArrayIndexName(child.name))
    .map((child) => toValueByProperty(ahkVersion, child, 0, 0, 'none', false));
  if (enumerableCount && samples.length < enumerableCount) {
    samples.push(ellipsisChars);
  }
  return `${property.className}(${enumerableCount}) [${samples.join(', ')}]`;
}
export function toValueByCallableProperty(property: ObjectPropertyLike, __root = true): string {
  if (!__root) {
    return 'ƒ';
  }
  return `${property.className} ƒ`;
}
export function toValueByClassProperty(ahkVersion: ParsedAutoHotkeyVersion, property: ObjectPropertyLike, __root = true): string {
  return property.className;
}
export function toValueByPrototypeProperty(ahkVersion: ParsedAutoHotkeyVersion, property: ObjectPropertyLike, __root = true): string {
  return property.className;
}

// #endregion value and object preview builders
