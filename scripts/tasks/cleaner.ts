import * as fs from 'fs';
import { buildDir } from '../config';
import { directoryExists } from '../utils';

export const cleanBuild = async(): Promise<void> => {
  if (directoryExists(buildDir)) {
    await fs.promises.rmdir(buildDir, { recursive: true });
  }
};
