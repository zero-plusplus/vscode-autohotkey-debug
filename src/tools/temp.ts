import * as os from 'os';
import * as path from 'path';
import { promises as fs, rmdirSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';

export const createRandomFileName = (prefix: string): string => {
  return `${prefix}-${Math.abs(randomBytes(10).readInt32LE()).toString().slice(0, 6)}`;
};

export interface TemporaryResource {
  path: string;
  cleanup: () => void;
}
export const createTempDirectory = async(prefix: string): Promise<TemporaryResource> => {
  const dirName = await fs.mkdtemp(`${prefix}-`, 'utf-8');
  const dirPath = path.resolve(os.tmpdir(), dirName);
  await fs.mkdir(dirPath);

  return {
    path: dirPath,
    cleanup: (): void => {
      rmdirSync(dirPath, { recursive: true });
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
