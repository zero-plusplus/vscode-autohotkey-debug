import { execSync } from 'child_process';
import { ESLint } from 'eslint';
import tsconfig from '../../tsconfig.json';
import eslintConfig from '../../eslint.config.js';

export const tscheck = async(): Promise<void> => {
  execSync('npx tsc --noEmit', { encoding: 'utf-8' });
  return Promise.resolve();
};
export const eslint = async(): Promise<void> => {
  const eslint = new ESLint({ baseConfig: eslintConfig, fix: true, cache: true });
  const results = await eslint.lintFiles(tsconfig.include).catch((err: unknown) => {
    throw err;
  });
  await ESLint.outputFixes(results);
};
