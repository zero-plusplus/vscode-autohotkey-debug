import * as path from 'path';
import del from 'del';

(async(): Promise<void> => {
  const buildDir = path.resolve(__dirname, '..', 'build');
  await del(buildDir);
  console.log('Task `clean` has been completed.');
})();
