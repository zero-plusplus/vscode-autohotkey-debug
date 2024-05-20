import { URI } from 'vscode-uri';
import { safeCall } from '../tools/utils';
import { CommandArg, ObjectProperty, PrimitiveProperty, Property, Session, UnsetProperty } from '../types/dbgp/session.types';
import { DataType } from '../types/dbgp/AutoHotkeyDebugger.types';
import { ParsedAutoHotkeyVersion } from '../types/tools/autohotkey/version/common.types';

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
  if (!('stackLevel' in value) || typeof value.stackLevel !== 'number') {
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
export const toAhkStringByJsString = (version: ParsedAutoHotkeyVersion, str_js: string): string => {
  const escaped_ahk = str_js
    .replace(/"/gu, 2 <= version.mejor ? '`"' : '""')
    .replace(/\r\n/gu, '`r`n')
    .replace(/\n/gu, '`n')
    .replace(/\r/gu, '`r')
    .replace(/[\b]/gu, '`b')
    .replace(/\t/gu, '`t')
    .replace(/\v/gu, '`v')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x07]/gu, '`a')
    .replace(/\f/gu, '`f');
  return escaped_ahk;
};
export const toJsStringByAhkString = (version: ParsedAutoHotkeyVersion, str_ahk: string): string => {
  const escaped_js = str_ahk
    .replace(2 <= version.mejor ? /`"/gu : /""/gu, '"')
    .replace(/`r`n/gu, '\r\n')
    .replace(/`n/gu, '\n')
    .replace(/`r/gu, '\r')
    .replace(/`b/gu, '\b')
    .replace(/`t/gu, '\t')
    .replace(/`v/gu, '\v')
    .replace(/`f/gu, '\f');
  return escaped_js;
};
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
export function encodeToBase64(value: string): string {
  return Buffer.from(value).toString('base64');
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
export async function toValueByProperty(session: Session, property: Property, maxChildren: number): Promise<string> {
  if (isObjectProperty(property)) {
    return toValueByObjetProperty(session, property, maxChildren);
  }
  return toValueByPrimitiveProperty(session, property);
}
export async function toValueByObjetProperty(session: Session, property: ObjectProperty, maxChildren: number): Promise<string> {
  const length = await session.getArrayLengthByProperty(property);
  if (length) {
    return toValueByArrayLikeProperty(session, property, length, maxChildren);
  }
  if (2 <= session.version.mejor && property.className === 'Func') {
    return `ƒ`;
  }
  if (property.className === '' || property.className === 'Object') {
    return toValueByRecordProperty(session, property, maxChildren);
  }
  return toValueByClassProperty(session, property, maxChildren);
}
export async function toValueByClassProperty(session: Session, property: ObjectProperty, maxChildren: number): Promise<string> {
  const summary = await toValueByRecordProperty(session, property, maxChildren);
  return `${property.className} ${summary}`;
}
export async function toValueByRecordProperty(session: Session, property: ObjectProperty, maxChildren: number): Promise<string> {
  if (maxChildren < 1) {
    return `{...}`;
  }

  const children = await session.getPropertyChildren(property, maxChildren);
  if (children.length === 0) {
    return '{}';
  }

  // const ellipsis = limit < property.children.length ? '...' : '';
  const childValues: string[] = [];
  for (const child of children) {
    const key = child.name;
    const type = isObjectProperty(child) ? child.type : toValueByPrimitiveProperty(session, child);
    childValues.push(`${key}: ${type}`);
  }
  return `{${childValues.join(', ')}}`;
}
export async function toValueByArrayLikeProperty(session: Session, property: ObjectProperty, maxLength: number, maxChildren: number): Promise<string> {
  if (maxChildren < 1) {
    return `[...]`;
  }

  const children = await session.getArrayElements(property, 1, maxChildren);
  const ellipsis = maxChildren < maxLength ? '...' : '';

  const childValues: string[] = [];
  for await (const child of children) {
    const type = await toValueByProperty(session, child, 0);
    childValues.push(type);
  }

  if (ellipsis !== '') {
    childValues.push(ellipsis);
  }
  return `[${childValues.join(', ')}]`;
}
export function toValueByPrimitiveProperty(session: Session, property: PrimitiveProperty): string {
  switch (property.type) {
    case 'string': return `"${toJsStringByAhkString(session.version, property.value)}"`;
    case 'integer':
    case 'float': return property.value;
    default: break;
  }
  return 'Not initialized';
}
// #endregion convert

// #region builder
export function toCommandArg(value: CommandArg): string {
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return escapeCommandArgValue(String(value));
}
export function createCommandArgs(...args: Array<CommandArg | undefined>): string[] {
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
}
// #endregion builder
