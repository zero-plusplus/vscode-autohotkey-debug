import { promises as fs } from 'fs';
import { fileExists } from '../predicate';

export const utf8BomText = '\uFEFF';
export const utf8BomCodes = [ 0xEF, 0xBB, 0xBF ];
export const checkUtf8WithBomByFile = async(filePath: string): Promise<boolean> => {
  if (!fileExists(filePath)) {
    return false;
  }

  const buffer = Buffer.alloc(3);
  const fileHandle = await fs.open(filePath, 'r');
  try {
    await fileHandle.read(buffer, 0, 3, 0);
  }
  finally {
    await fileHandle.close();
  }
  return utf8BomCodes.every((code, i) => buffer[i] === code);
};
export const checkUtf8WithBomByText = (textOrBuffer: string | Buffer): boolean => {
  const text = textOrBuffer.toString();
  return text.startsWith(utf8BomText);
};
