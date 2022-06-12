import * as esbuild from 'esbuild';
import { esbuildOptions } from './_config';

(async(): Promise<void> => {
  await esbuild.build(esbuildOptions);
  console.log('Task `build` has been completed.');
})();
