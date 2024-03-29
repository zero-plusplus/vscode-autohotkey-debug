import * as path from 'path';
import { promises as fs, rmSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';

export const createRandomFileName = (prefix: string): string => {
  return `${prefix}-${Math.abs(randomBytes(10).readInt32LE()).toString().slice(0, 6)}`;
};

export interface TemporaryResource {
  path: string;
  cleanup: () => void;
}
export const createTempDirectory = async(prefix: string): Promise<TemporaryResource> => {
  const tempDir = path.resolve(process.env.windir ?? '', '..', 'Users', process.env.USERNAME ?? '', 'AppData', 'Local', 'Temp');
  const dirPath = await fs.mkdtemp(path.resolve(tempDir, `${prefix}-`), 'utf-8');

  return {
    path: dirPath,
    cleanup: (): void => {
      rmSync(dirPath, { recursive: true });
    },
  };
};

export const createTempFile = async(dirPath: string, filePrefix: string, extension: string, text?: string): Promise<TemporaryResource> => {
  const fileName = createRandomFileName(filePrefix) + extension;
  const filePath = path.resolve(dirPath, fileName);
  if (typeof text === 'string') {
    await fs.writeFile(filePath, text, 'utf-8');
  }

  return {
    path: filePath,
    cleanup: (): void => {
      unlinkSync(filePath);
    },
  };
};
export const createTempDirectoryWithFile = async(prefix: string, extension: string, text: string): Promise<TemporaryResource> => {
  const tempDir = await createTempDirectory(prefix);
  const tempFile = await createTempFile(tempDir.path, prefix, extension, text);

  return {
    path: tempFile.path,
    cleanup: (): void => {
      tempFile.cleanup();
      tempDir.cleanup();
    },
  };
};
