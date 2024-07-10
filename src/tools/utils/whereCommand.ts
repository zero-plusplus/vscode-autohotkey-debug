import * as path from 'path';
import { spawnSync } from 'child_process';
import { isValidWindowsFileName } from '../predicate';

export const whereCommand = (name: string): string | undefined => {
  if (!isValidWindowsFileName(name)) {
    return undefined;
  }

  const result = spawnSync(`where`, [ name ]);
  if (result.error) {
    return undefined;
  }

  const filePathList = result.stdout.toString().split('\r\n');
  if (filePathList.length === 0) {
    return undefined;
  }

  const filePath = filePathList[0];
  if (path.isAbsolute(filePath)) {
    return path.resolve(filePath);
  }
  return undefined;
};
