import { statSync } from 'fs';

export const directoryExists = (dirPath: string): boolean => {
  try {
    return statSync(dirPath).isDirectory();
  }
  catch {
  }
  return false;
};
export const fileExists = (filePath: string): boolean => {
  try {
    return statSync(filePath).isFile();
  }
  catch {
  }
  return false;
};
