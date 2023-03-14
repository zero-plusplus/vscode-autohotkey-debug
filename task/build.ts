import * as esbuild from 'esbuild';
import { esbuildOptions } from './_config';

export const buildProject = async(): Promise<void> => {
  await esbuild.build(esbuildOptions);
};

(async(): Promise<void> => {
  await buildProject();
  console.log('Task `build` has been completed.');
})();
