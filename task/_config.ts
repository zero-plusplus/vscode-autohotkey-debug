import * as path from 'path';
import * as glob from 'fast-glob';
import * as esbuild from 'esbuild';

const rootDir = path.resolve(__dirname, '..');
const esbuildCommonOptions: esbuild.BuildOptions = {
  platform: 'node',
  format: 'cjs',
};
export const esbuildOptions: esbuild.BuildOptions = {
  ...esbuildCommonOptions,
  entryPoints: [ `${rootDir}/src/editors/vscode/extension.ts` ],
  outfile: `${rootDir}/build/editors/vscode/extension.js`,
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
