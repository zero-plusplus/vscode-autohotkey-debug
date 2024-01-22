import * as path from 'path';
import * as glob from 'fast-glob';
import * as esbuild from 'esbuild';

// #region path
export const projectRootDir = path.resolve(__dirname, '..');
export const buildDir = path.resolve(projectRootDir, 'build');
// #endregion path

// #region esbuild options
const esbuildCommonOptions: esbuild.BuildOptions = {
  platform: 'node',
  format: 'cjs',
};
export const esbuildOptions: esbuild.BuildOptions = {
  ...esbuildCommonOptions,
  entryPoints: [ `${projectRootDir}/src/v1-0-0/extension.ts` ],
  outfile: `${projectRootDir}/build/v1-0-0/extension.js`,
  bundle: true,
  minify: true,
  treeShaking: true,
  external: [
    'vscode-uri',
    'vscode',
    'jsonc-parser',
  ],
};
export const esbuildDebugOptions: esbuild.BuildOptions = {
  ...esbuildCommonOptions,
  entryPoints: glob.sync(`./src/**/*.ts`),
  outdir: 'build',
  sourcemap: true,
};
// #endregion esbuild options
