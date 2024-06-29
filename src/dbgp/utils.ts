import { URI } from 'vscode-uri';
import * as dbgp from '../types/dbgp/AutoHotkeyDebugger.types';
import { CommandArg } from '../types/dbgp/session.types';
import { ParsedAutoHotkeyVersion } from '../types/tools/autohotkey/version/common.types';

// #region predicates
export function isUncPath(fileName: string): boolean {
  return fileName.startsWith('\\\\');
}
export function isDataType(value: any): value is dbgp.DataType {
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
export function isProperty(value: any): value is dbgp.Property {
  return isPrimitiveProperty(value) || isObjectProperty(value);
}
export function isPrimitiveProperty(value: any): value is dbgp.PrimitiveProperty {
  if (typeof value !== 'object') {
    return false;
  }
  if (!('attributes' in value)) {
    return false;
  }

  return [ 'children', 'encoding', 'facet', 'fullname', 'name', 'size', 'type' ].every((name) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (name in value.attributes);
  });
}
export function isObjectProperty(value: any): value is dbgp.ObjectProperty {
  if (typeof value !== 'object') {
    return false;
  }
  if (!('attributes' in value)) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if ('type' in value.attributes && value.attributes.type !== 'object') {
    return false;
  }

  return [ 'address', 'children', 'classname', 'facet', 'fullname', 'name', 'numchildren', 'page', 'size', 'type' ].every((name) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (name in value.attributes);
  });
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
  return (/\[\d+\]/u).test(value);
}
export function isArrayElement(value: any): value is dbgp.Property {
  if (isProperty(value)) {
    return isArrayIndexName(value.attributes.name);
  }
  return false;
}
export function isMapKeyName(value: any): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.startsWith('["') && value.endsWith('"]')) {
    return true;
  }
  if (value.startsWith('[Object') && value.endsWith(')]')) {
    return true;
  }
  if (isArrayIndexName(value)) {
    return true;
  }
  return false;
}
export function isMapElement(value: any): value is dbgp.Property {
  if (isProperty(value)) {
    return isMapKeyName(value.attributes.name);
  }
  return false;
}
export function isNamedPropertyName(value: any): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  if (isSpecialName(value)) {
    return true;
  }
  if ((/^[\w_$#@]+$/u).test(value)) {
    return true;
  }
  return false;
}
export function isNamedProperty(value: any): value is dbgp.Property {
  if (isProperty(value)) {
    return isNamedPropertyName(value.attributes.name);
  }
  return false;
}
export function isRecordKeyName(value: any): value is string {
  return isNamedPropertyName(value) || isMapKeyName(value);
}
export function isRecordElement(value: any): value is dbgp.Property {
  if (isProperty(value)) {
    return isRecordKeyName(value.attributes.name);
  }
  return false;
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
export const toJsStringByAhk2String = (str_ahk: string): string => {
  const escaped_js = str_ahk
    .replace(/""/gu, '"')
    .replace(/`r`n/gu, '\r\n')
    .replace(/`n/gu, '\n')
    .replace(/`r/gu, '\r')
    .replace(/`b/gu, '\b')
    .replace(/`t/gu, '\t')
    .replace(/`v/gu, '\v')
    .replace(/`f/gu, '\f');
  return escaped_js;
};
export const toJsStringByAhk1String = (str_ahk: string): string => {
  const escaped_js = str_ahk
    .replace(/`"/gu, '"')
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
export function toDbgpFileName(filePath: string): string {
  return URI.file(filePath).toString().toLowerCase();
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
