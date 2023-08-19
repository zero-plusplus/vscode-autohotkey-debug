import * as esbuild from 'esbuild';
import { esbuildDebugOptions } from './_config';

export const debugBuildProject = async(): Promise<void> => {
  await esbuild.build({ ...esbuildDebugOptions });
};

(async(): Promise<void> => {
  await debugBuildProject();
  console.log('Task `debugBuild` has been completed.');
})();
