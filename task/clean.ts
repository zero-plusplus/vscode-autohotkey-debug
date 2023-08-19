import * as path from 'path';
import del from 'del';

export const cleanBuild = async(): Promise<void> => {
  const buildDir = path.resolve(__dirname, '..', 'build');
  await del(buildDir);
};

(async(): Promise<void> => {
  await cleanBuild();
  console.log('Task `clean` has been completed.');
})();
