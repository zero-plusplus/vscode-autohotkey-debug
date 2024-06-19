import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { Context, ContextIdentifier, ExecutionContextManager, ObjectProperty, PrimitiveProperty, Property, StackFrame } from '../../types/dap/runtime/context.types';
import { CommandArg, Session } from '../../types/dbgp/session.types';
import { isArrayIndexName, isNamedPropertyName, toFsPath } from '../../dbgp/utils';
import { isNumberLike } from '../../tools/predicate';
import { countBy } from '../../tools/utils/countBy';
import { repeatUntilAsync } from '../../tools/utils';

export const createExecutionContextManager = (session: Session): ExecutionContextManager => {
  const context: ExecutionContextManager = {
    getFeature: async(...args) => getFeature(session, ...args),
    getMaxChildren: async() => getMaxChildren(session),
    getMaxDepth: async() => getMaxDepth(session),
    setFeature: async(...args) => setFeature(session, ...args),
    setMaxChildren: async(...args) => setMaxChildren(session, ...args),
    setMaxDepth: async(...args) => setMaxDepth(session, ...args),
    getCallStack: async() => getCallStack(session),
    getStackFrame: async(...args) => getStackFrame(session, ...args),
    getContextIdentifiers: async(...args) => getContextIdentifiers(session, ...args),
    getContexts: async(...args) => getContexts(session, ...args),
    getProperty: async(...args) => getProperty(session, ...args),
    setProperty: async(...args) => setProperty(session, ...args),
  };
  return context;
};

// #region wrapper
const encoding = 'base64';

// #region wrapped [7.2.2 feature_get](https://xdebug.org/docs/dbgp#feature-get)
export async function getFeature(session: Session, featureName: dbgp.FeatureName): Promise<string> {
  const { content } = await session.sendFeatureGetCommand(featureName);

  return Buffer.from(content, encoding).toString();
}
export async function getMaxChildren(session: Session): Promise<number> {
  return Number(await getFeature(session, 'max_children'));
}
export async function getMaxDepth(session: Session): Promise<number> {
  return Number(await getFeature(session, 'max_depth'));
}
// #endregion wrapped [7.2.2 feature_get](https://xdebug.org/docs/dbgp#feature-get)

// #region wrapped [7.2.3 feature_set](https://xdebug.org/docs/dbgp#feature-set)
export async function setFeature(session: Session, featureName: dbgp.FeatureName, value: CommandArg): Promise<boolean> {
  await session.sendFeatureSetCommand(featureName, value);
  return true;
}
export async function setMaxChildren(session: Session, maxChildren: number): Promise<boolean> {
  return setFeature(session, 'max_children', maxChildren);
}
export async function setMaxDepth(session: Session, depth: number): Promise<boolean> {
  return setFeature(session, 'max_depth', depth);
}
// #endregion wrapped [7.2.3 feature_set](https://xdebug.org/docs/dbgp#feature-set)

// #region wrapped [7.8 stack_get](https://xdebug.org/docs/dbgp#stack-get)
export async function getCallStack(session: Session): Promise<StackFrame[]> {
  const response = await session.sendStackGetCommand();
  if (!response.stack) {
    return [
      {
        fileName: '',
        level: 0,
        line: 0,
        type: 'file',
        where: 'Standby',
      },
    ];
  }

  const dbgpCallStack = Array.isArray(response.stack) ? response.stack : [ response.stack ];
  return dbgpCallStack.map(({ attributes: { where, level, filename, lineno, type } }) => {
    const fileName = toFsPath(filename);
    return {
      fileName,
      level: Number(level),
      line: Number(lineno),
      type,
      where,
    };
  });
}
export async function getStackFrame(session: Session, level: number): Promise<StackFrame | undefined> {
  const callStack = await getCallStack(session);
  if (0 <= level && level < callStack.length) {
    return callStack[level];
  }
  return undefined;
}
// #endregion wrapped [7.8 stack_get](https://xdebug.org/docs/dbgp#stack-get)

// wrapped [7.9 context_names](https://xdebug.org/docs/dbgp#context-names)
export async function getContextIdentifiers(session: Session): Promise<ContextIdentifier[]> {
  const { context: dbgpContexts } = await session.sendContextNamesCommand();
  return dbgpContexts.map(({ attributes: { id, name } }) => {
    return {
      id: Number(id) as dbgp.ContextId,
      name,
    };
  });
}

// #region wrapped [7.10 context_get](https://xdebug.org/docs/dbgp#context-get)
export async function getContext(session: Session, contextNameOrId: dbgp.ContextId | dbgp.ContextName, stackFrameLevel = 0, maxDepth?: number, maxChildren?: number): Promise<Context> {
  const { property: dbgpProperties } = await session.sendContextGetCommand(contextNameOrId, stackFrameLevel, maxDepth, maxChildren);

  const contextId = typeof contextNameOrId === 'string' ? dbgp.contextIdByName[contextNameOrId] : contextNameOrId;
  return {
    id: contextId,
    stackFrameLevel,
    name: dbgp.contextNameById[contextId],
    properties: toProperties(dbgpProperties, contextId, stackFrameLevel) ?? [],
  };
}
export async function getContexts(session: Session, stackFrameLevel = 0, maxDepth?: number, maxChildren?: number): Promise<Context[]> {
  const contexts: Context[] = [];

  const contextIdentifiers = await getContextIdentifiers(session);
  for await (const contextIdentifier of contextIdentifiers) {
    const context = await getContext(session, contextIdentifier.id, stackFrameLevel, maxDepth, maxChildren);
    contexts.push(context);
  }
  return contexts;
}
// #endregion wrapped [7.10 context_get](https://xdebug.org/docs/dbgp#context-get)

// #region wrapped [7.13 property_get, property_set, property_value](https://xdebug.org/docs/dbgp#property-get-property-set-property-value)
export async function getProperty(session: Session, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number, maxDepth = 0, maxChildren?: number, page?: number): Promise<Property | undefined> {
  const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

  const response = await session.sendPropertyGetCommand(name, contextId, stackLevel, maxDepth, maxChildren, page);
  if (response.property === undefined) {
    return undefined;
    // return {
    //   constant: true,
    //   contextId,
    //   stackLevel,
    //   name,
    //   fullName: name,
    //   type: 'undefined',
    //   value: '',
    //   size: 0,
    // } as PrimitiveProperty;
  }
  if (response.property.attributes.type === 'object') {
    return toObjectProperty(response.property as dbgp.ObjectProperty, contextId, stackLevel);
  }
  return toPrimitiveProperty(response.property as dbgp.PrimitiveProperty, contextId, stackLevel);
}
export async function getPrimitivePropertyValue(session: Session, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number): Promise<string | undefined> {
  const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

  const property = await getProperty(session, name, contextId, stackLevel);
  if (isPrimitiveProperty(property)) {
    return property.value;
  }
  return undefined;
}
export async function setProperty(session: Session, name: string, value: string | number | boolean, type?: dbgp.DataType, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number): Promise<Property> {
  let propertyValue = String(value);
  if (typeof value === 'boolean') {
    propertyValue = value ? '1' : '0';
  }

  await session.sendPropertySetCommand(name, propertyValue, type, contextIdOrName, stackLevel);
  const property = await getProperty(session, name, contextIdOrName, stackLevel);
  if (property === undefined) {
    throw Error('Could not get the set property.');
  }
  return property;
}
// #endregion wrapped [7.13 property_get, property_set, property_value](https://xdebug.org/docs/dbgp#property-get-property-set-property-value)
// #endregion wrapper

// #region custom query
export async function reloadObjectProperty(session: Session, property: ObjectProperty, maxDepth?: number, maxChildren?: number, page?: number): Promise<ObjectProperty | undefined> {
  const reloadedProperty = await getProperty(session, property.fullName, property.contextId, property.stackLevel, maxDepth, maxChildren, page);
  if (isObjectProperty(reloadedProperty) && reloadedProperty.address === property.address) {
    return reloadedProperty;
  }
  return undefined;
}
export async function getObjectPropertyLastPage(session: Session, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number, pageSize?: number): Promise<number> {
  const property = await getProperty(session, name, contextIdOrName, stackLevel, 0, pageSize);
  if (!isObjectProperty(property)) {
    return -1;
  }

  if (property.numberOfChildren === undefined) {
    return -1;
  }

  const lastPage = Math.trunc(property.numberOfChildren / property.pageSize);
  if ((property.numberOfChildren % property.pageSize) === 0) {
    return lastPage + 1;
  }
  return lastPage;
}
export async function getLastPageChildren(session: Session, property: ObjectProperty): Promise<Property[] | undefined> {
  if (property.numberOfChildren === undefined) {
    return undefined;
  }
  if (property.children && property.children.length < property.numberOfChildren) {
    return property.children;
  }

  const lastPage = Math.ceil(property.numberOfChildren / property.pageSize);
  const property_lastPage = await reloadObjectProperty(session, property, 1, property.pageSize, lastPage);
  if ((property.numberOfChildren % property.pageSize) === 0) {
    const property_remainder = await reloadObjectProperty(session, property, 1, property.pageSize, lastPage + 1);
    return [ ...(property_lastPage?.children ?? []), ...(property_remainder?.children ?? []) ];
  }
  if (property_lastPage?.children && 0 < property_lastPage.children.length) {
    return property_lastPage.children;
  }
  return property.children;
}
export async function getEnumerableProperties(session: Session, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number, maxDepth?: number, maxChildren?: number, page = 0): Promise<Property[] | undefined> {
  if (2.0 <= session.ahkVersion.mejor) {
    const enumProperty = await getProperty(session, `${name}.<enum>`, contextIdOrName, stackLevel, maxDepth, maxChildren, page);
    if (isObjectProperty(enumProperty)) {
      return enumProperty.children;
    }
    return undefined;
  }

  const chunkSize = 100;
  const startRange = (chunkSize * page) + 1;
  const endRange = chunkSize * (page + 1);
  const children = (await repeatUntilAsync(async(index) => {
    if (endRange < index) {
      return undefined;
    }
    const element = await getProperty(session, `${name}[${index}]`, contextIdOrName, stackLevel, maxDepth, maxChildren, 0);
    if (element === undefined) {
      return undefined;
    }
    if (element.type === 'undefined') {
      return undefined;
    }

    element.name = `[${index}]`;
    return element;
  }, startRange)).flat();
  return children;
}
export async function getNonEnumerableProperties(session: Session, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number, maxDepth?: number, maxChildren?: number): Promise<Property[] | undefined> {
  const nonEnumerableProperties = (await repeatUntilAsync(getNonEnumerableByPage)).flat();
  if (2.0 <= session.ahkVersion.mejor) {
    return nonEnumerableProperties;
  }

  const lastPage = await getObjectPropertyLastPage(session, name, contextIdOrName, stackLevel, maxChildren);
  if (lastPage === -1) {
    return nonEnumerableProperties;
  }
  const nonEnumerableProperties_lastPage = (await repeatUntilAsync(getNonEnumerableByPage, lastPage, -1)).flat();
  if (0 < nonEnumerableProperties_lastPage.length) {
    return [ ...nonEnumerableProperties, ...nonEnumerableProperties_lastPage ];
  }
  return nonEnumerableProperties;

  async function getNonEnumerableByPage(page: number): Promise<Property[] | undefined> {
    const property = await getProperty(session, name, contextIdOrName, stackLevel, maxDepth, maxChildren, page);
    if (!isObjectProperty(property) || property.children === undefined) {
      return undefined;
    }

    const children = property.children.filter((child) => isNamedPropertyName(child.name));
    if (children.length === 0) {
      return undefined;
    }
    return children;
  }
}
export async function getPropertyNumberOfChildren(session: Session, property: ObjectProperty): Promise<number> {
  if (property.numberOfChildren !== undefined) {
    return property.numberOfChildren;
  }

  const numberOfChildren = await getPrimitivePropertyValue(session, `ObjOwnPropCount(Object(${property.address})) + (ObjGetBase(Object(${property.address})) != "") + (HasMethod(Object(${property.address}), "__Enum") != 0)`, property.contextId, property.stackLevel);
  if (isNumberLike(numberOfChildren)) {
    return Number(numberOfChildren);
  }
  return -1;
}
export async function getPropertyNonEnumerableCount(session: Session, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number, maxDepth?: number, maxChildren?: number): Promise<number> {
  const children = await getNonEnumerableProperties(session, name, contextIdOrName, stackLevel, maxDepth, maxChildren);
  if (children === undefined) {
    return -1;
  }
  return countBy(children, (child) => !isArrayIndexName(child.name));
}
export async function getPropertyCount(session: Session, property: ObjectProperty): Promise<number> {
  if (2.0 <= session.ahkVersion.mejor) {
    const length = await getPrimitivePropertyValue(session, `${property.fullName}.Count`, property.contextId, property.stackLevel);
    if (isNumberLike(length)) {
      return Number(length);
    }
    return -1;
  }

  // AutoHotkey v1
  if (property.numberOfChildren === undefined) {
    return -1;
  }

  const maxIndex = await getPropertyLength(session, property);
  if (-1 < maxIndex) {
    return property.numberOfChildren - maxIndex;
  }
  return maxIndex;
}
export async function getPropertyLength(session: Session, property: ObjectProperty): Promise<number> {
  if (2.0 <= session.ahkVersion.mejor) {
    const length = await getPrimitivePropertyValue(session, `${property.fullName}.Length`, property.contextId, property.stackLevel);
    if (isNumberLike(length)) {
      return Number(length);
    }
    return -1;
  }

  // AutoHotkey v1
  if (property.numberOfChildren === undefined) {
    return -1;
  }

  const children = await getLastPageChildren(session, property);
  if (children === undefined) {
    return -1;
  }

  const maxIndex_str = children.findLast((child) => isArrayIndexName(child.name))?.name.slice(1, -1); // [100] -> 100
  if (maxIndex_str === undefined) {
    return -1;
  }
  const maxIndex = Number(maxIndex_str);
  if (isNaN(maxIndex)) {
    return -1;
  }
  return maxIndex;
}
// #endregion custom query

// #region utils
export function isProperty(value: any): value is Property {
  return isPrimitiveProperty(value) || isObjectProperty(value);
}
export function isPrimitiveProperty(value: any): value is PrimitiveProperty {
  if (typeof value !== 'object') {
    return false;
  }

  return [ 'constant', 'value', 'contextId', 'name', 'fullName', 'size', 'type' ].every((name) => {
    const hasField = (name in value);
    if (name === 'type') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return hasField && value.type !== 'object';
    }
    return hasField;
  });
}
export function isObjectProperty(value: any): value is ObjectProperty {
  if (typeof value !== 'object') {
    return false;
  }
  return [ 'contextId', 'name', 'fullName', 'size', 'type', 'className', 'facet', 'hasChildren', 'numberOfChildren', 'address' ].every((name) => {
    const hasField = (name in value);
    if (name === 'type') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return hasField && value.type === 'object';
    }
    return hasField;
  });
}
export function toProperties(dbgpProperty: dbgp.Property | dbgp.Property[] | undefined, contextId: dbgp.ContextId = 0, stackLevel = 0, __root = true): Property[] | undefined {
  if (!dbgpProperty) {
    return undefined;
  }

  const dbgpProperties = Array.isArray(dbgpProperty) ? dbgpProperty : [ dbgpProperty ];
  if (__root) {
    return dbgpProperties.map((rawProperty) => toProperty(rawProperty, contextId, stackLevel));
  }

  const children = dbgpProperties.slice(0, 5);
  return children.map((child) => toProperty(child, contextId, stackLevel));
}
export function toProperty(dbgpProperty: dbgp.Property, contextId: dbgp.ContextId = 0, stackLevel = 0, __root = true): Property {
  if (dbgpProperty.attributes.type === 'object') {
    return toObjectProperty(dbgpProperty as dbgp.ObjectProperty, contextId, stackLevel);
  }
  return toPrimitiveProperty(dbgpProperty as dbgp.PrimitiveProperty, contextId, stackLevel);
}
export function toPrimitiveProperty(rawProperty: dbgp.PrimitiveProperty, contextId: dbgp.ContextId = 0, stackLevel = 0): PrimitiveProperty {
  return {
    contextId,
    stackLevel,
    name: rawProperty.attributes.name,
    fullName: rawProperty.attributes.fullname,
    constant: rawProperty.attributes.constant === '1',
    size: Number(rawProperty.attributes.size),
    type: rawProperty.attributes.type,
    value: Buffer.from(rawProperty.content ?? '', 'base64').toString(),
  };
}
export function toObjectProperty(rawProperty: dbgp.ObjectProperty, contextId: dbgp.ContextId = 0, stackLevel = 0, __root = true): ObjectProperty {
  return {
    contextId,
    stackLevel,
    name: rawProperty.attributes.name,
    fullName: rawProperty.attributes.fullname,
    className: rawProperty.attributes.classname,
    facet: rawProperty.attributes.facet,
    address: Number(rawProperty.attributes.address),
    hasChildren: rawProperty.attributes.children === '1',
    numberOfChildren: Number(rawProperty.attributes.numchildren),
    children: toProperties(rawProperty.property, contextId, stackLevel, __root),
    size: Number(rawProperty.attributes.size),
    type: 'object',
    page: Number(rawProperty.attributes.page),
    pageSize: Number(rawProperty.attributes.pagesize),
  };
}
// #endregion utils
