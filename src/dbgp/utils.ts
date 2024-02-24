import { URI } from 'vscode-uri';
import * as dbgp from '../types/dbgp/ExtendAutoHotkeyDebugger.types';
import { safeCall } from '../tools/utils';

export const isUncPath = (fileName: string): boolean => {
  return fileName.startsWith('\\\\');
};
export const isDbgpFileName = (filePath: any): filePath is dbgp.FileName => {
  if (typeof filePath !== 'string') {
    return false;
  }

  if (toDbgpFileName(filePath, undefined) === undefined) {
    return false;
  }
  return true;
};
export const toDbgpFileName = <D = undefined>(filePath: string, defaultValue?: D): dbgp.FileName | D => {
  const uri = safeCall(() => URI.parse(filePath).toString().toLowerCase());
  if (uri) {
    return uri as dbgp.FileName;
  }

  const uriFromFilePath = safeCall(() => URI.file(filePath).toString().toLowerCase());
  if (uriFromFilePath) {
    return uriFromFilePath as dbgp.FileName;
  }
  return defaultValue as D;
};
export const toFsPath = <D = undefined>(fileName: string, defaultValue?: D): string | D => {
  try {
    const uriString = toDbgpFileName(fileName, undefined);
    if (uriString) {
      const fsPath = URI.parse(uriString).fsPath;

      // The UNC path is somehow converted as follows and needs to be corrected.
      // "\\\\server\\share" -> "\\\\\\server\\share"
      if (fsPath.startsWith('\\\\\\')) {
        return fsPath.slice(1);
      }
      return fsPath;
    }
  }
  catch {
  }
  return defaultValue as D;
};

export const escapeCommandArgValue = (value: string): string => {
  return `"${value.replaceAll('"', '\\"').replaceAll('\0', '\\0')}"`;
};
export const encodeToBase64 = (value: string): string => {
  return Buffer.from(value).toString('base64');
};
export const createCommandArgs = (...args: Array<string | number | boolean | undefined>): string[] => {
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
      return String(arg);
    }
    else if (arg === undefined) {
      return [];
    }


    if (typeof arg === 'boolean') {
      return arg ? '1' : '0';
    }
    if (typeof arg === 'number') {
      return String(arg);
    }
    return [ escapeCommandArgValue(String(arg)) ];
  });
};
