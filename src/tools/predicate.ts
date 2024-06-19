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

export const isNumberLike = (value: any): boolean => {
  if (value === '') {
    return false;
  }
  const converted = Number(value);
  if (isNaN(converted)) {
    return false;
  }
  return true;
};
export const isNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value);
};
export const isFloat = (value: any): boolean => {
  const num = Number(value);
  return !Number.isInteger(num) && Number.isFinite(num);
};
