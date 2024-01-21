import { esbuildDebugOptions, esbuildOptions } from '../config';
import { createBackgroundTask, createTask } from '../utils';
import { build } from './builder';
import { cleanBuild } from './cleaner';
import { eslint, tscheck } from './linter';
import { packageByVsce } from './packager';
import { startSandBox } from './sandbox';
import { startWatch } from './wacher';

export const runBuild = createTask('build', async() => {
  await cleanBuild();
  await build(esbuildDebugOptions);
});
export const runPublicBuild = createTask('build', async() => {
  await cleanBuild();
  build(esbuildOptions);
});
export const runClean = createTask('clean', async() => cleanBuild());
export const runLint = createTask('lint', async() => {
  await tscheck();
  await eslint();
});
export const runWatch = createBackgroundTask('watch', async() => {
  await cleanBuild();
  await startWatch(esbuildDebugOptions);
});
export const runWatchByPublicBuild = createBackgroundTask('watch', async() => {
  await cleanBuild();
  await startWatch(esbuildOptions);
});
export const runPackage = createTask('package', async() => {
  await runLint();
  await runPublicBuild();
  await packageByVsce();
});
export const runSandBox = createTask('sandbox', async() => {
  await runPackage();
  await startSandBox();
});
