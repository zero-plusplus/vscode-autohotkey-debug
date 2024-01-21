import del from 'del';
import { buildDir } from '../config';

export const cleanBuild = async(): Promise<void> => {
  await del(buildDir);
};
