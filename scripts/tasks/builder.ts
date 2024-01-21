import * as esbuild from 'esbuild';

export const build = async(options: esbuild.BuildOptions): Promise<esbuild.BuildResult> => {
  return esbuild.build(options);
};
