import { URI } from 'vscode-uri';
import { safeCall } from '../tools/utils';

export const isUncPath = (fileName: string): boolean => {
  return fileName.startsWith('\\\\');
};
export const toDbgpFileName = (filePath: string): string | undefined => {
  const uriFromFilePath = safeCall(() => URI.file(filePath).toString().toLowerCase());
  if (uriFromFilePath) {
    return uriFromFilePath;
  }
  return undefined;
};
export const toFsPath = (fileName: string): string => {
  const fsPath = URI.parse(fileName).fsPath;

  // The UNC path is somehow converted as follows and needs to be corrected.
  // "\\\\server\\share" -> "\\\\\\server\\share"
  if (fsPath.startsWith('\\\\\\')) {
    return fsPath.slice(1);
  }
  return fsPath;
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
      return [ String(arg) ];
    }
    else if (arg === undefined) {
      return [];
    }


    if (typeof arg === 'boolean') {
      return arg ? '1' : '0';
    }
    if (typeof arg === 'number') {
      return [ String(arg) ];
    }

    const hasEscapeChar = (/\s|\0/u).test(String(arg));
    if (hasEscapeChar) {
      return [ escapeCommandArgValue(String(arg)) ];
    }
    return [ String(arg) ];
  });
};
