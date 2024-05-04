import { URI } from 'vscode-uri';
import { safeCall } from '../tools/utils';
import { CommandArg, ObjectProperty, PrimitiveProperty, Property, UnsetProperty } from '../types/dbgp/session.types';
import { DataType } from '../types/dbgp/AutoHotkeyDebugger.types';

// #region predicates
export function isUncPath(fileName: string): boolean {
  return fileName.startsWith('\\\\');
}
export function isDataType(value: any): value is DataType {
  switch (value) {
    case 'undefined':
    case 'string':
    case 'integer':
    case 'float':
    case 'object':
      return true;
    default: break;
  }
  return false;
}
export function isProperty(value: any): value is Property {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!('contextId' in value) || typeof value.contextId !== 'number') {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!('depth' in value) || typeof value.depth !== 'number') {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!('name' in value) || typeof value.name !== 'string') {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!('fullName' in value) || typeof value.fullName !== 'string') {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!('size' in value) || typeof value.size !== 'number') {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!('type' in value) || !isDataType(value.type)) {
    return false;
  }
  return true;
}
export function isObjectProperty(value: any): value is ObjectProperty {
  return isProperty(value) && 'address' in value;
}
export function isSpecialName(value: any): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return value.startsWith('<') && value.endsWith('>');
}
export function isObjectAddressName(value: any): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return value.startsWith('[Object(') && value.endsWith(')]');
}
export function isArrayIndexName(value: any): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return (value.startsWith('[') && value.endsWith(']'));
}
export function isArrayProperty(value: any): value is ObjectProperty {
  if (!isObjectProperty(value)) {
    return false;
  }

  let index = 1;
  const limit = 15;
  for (const child of value.children.slice(0, limit)) {
    if (isArrayIndexName(child.name)) {
      const childIndex = Number(child.name.slice(1, -1));
      if (index === childIndex) {
        index++;
        continue;
      }
      return false;
    }
    continue;
  }
  return 0 < index;
}
export function isUnsetProperty(value: any): value is UnsetProperty {
  return isProperty(value) && !isObjectProperty(value) && value.type === 'undefined';
}
export function isPrimitiveProperty(value: any): value is PrimitiveProperty {
  return isProperty(value) && !isUnsetProperty(value);
}
// #endregion predicates

// #region convert
export function escapeCommandArgValue(value: string): string {
  const replacementEntries: Array<[ RegExp, string ]> = [
    [ /\\(?!0)/gu, '\\\\' ],
    [ /"/gu, '\\"' ],
    [ /\0/gu, '\\0' ],
  ];

  const escapedValue = replacementEntries.reduce((escapedValue, [ original, escaped ]) => {
    return escapedValue.replace(original, escaped);
  }, value);
  return `"${escapedValue}"`;
}
export function encodeToBase64(value: CommandArg): string {
  return Buffer.from(toCommandArg(value)).toString('base64');
}
export function toDbgpFileName(filePath: string): string | undefined {
  const uriFromFilePath = safeCall(() => URI.file(filePath).toString().toLowerCase());
  if (uriFromFilePath) {
    return uriFromFilePath;
  }
  return undefined;
}
export function toFsPath(fileName: string): string {
  const fsPath = URI.parse(fileName).fsPath;

  // The UNC path is somehow converted as follows and needs to be corrected.
  // "\\\\server\\share" -> "\\\\\\server\\share"
  if (fsPath.startsWith('\\\\\\')) {
    return fsPath.slice(1);
  }
  return fsPath;
}
export const toValueByProperty = (property: Property): string => {
  if (isObjectProperty(property)) {
    return toValueByObjectProperty(property);
  }
  return toValueByPrimitiveProperty(property);
};
export const toValueByPrimitiveProperty = (property: PrimitiveProperty | UnsetProperty): string => {
  switch (property.type) {
    case 'string': return `"${property.value}"`;
    case 'integer':
    case 'float':
    case 'undefined': return property.value;
    default: break;
  }
  return 'undefined';
};
export const toValueByObjectProperty = (property: ObjectProperty): string => {
  const isArray = isArrayProperty(property);

  const limit = 15;
  const childValues: string[] = [];
  for (const child of property.children.slice(0, limit)) {
    const childValue = toValueByProperty(child);
    childValues.push(isArray ? childValue : `${child.name}: ${childValue}`);
  }

  const ellipsis = limit < property.children.length ? '...' : '';
  if (isArray) {
    return childValues.length === 0 ? `[]` : `[ ${childValues.join(', ')}${ellipsis} ]`;
  }
  return childValues.length === 0 ? `{}` : `{ ${childValues.join(', ')}${ellipsis} }`;
};
// #endregion convert

// #region builder
export const toCommandArg = (value: CommandArg): string => {
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return escapeCommandArgValue(String(value));
};
export const createCommandArgs = (...args: Array<CommandArg | undefined>): string[] => {
  return args.flatMap((arg, i, args) => {
    const isFlag = typeof arg === 'string' && arg.startsWith('-');
    if (isFlag) {
      const nextArg = args.at(i + 1);

      // If undefined is specified for the flag value, the entire flag is removed.
      // -d <undefined>
      const shouldRemoveFlag = i < args.length && nextArg === undefined;
      if (shouldRemoveFlag) {
        return [];
      }
      return [ String(arg) ];
    }
    else if (arg === undefined) {
      return [];
    }

    return [ toCommandArg(arg) ];
  });
};
// #endregion builder
