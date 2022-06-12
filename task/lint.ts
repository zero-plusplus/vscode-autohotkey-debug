import { execSync } from 'child_process';
import { ESLint } from 'eslint';
import tsconfig from '../tsconfig.json';
import eslintrc from '../.eslintrc';

const tscheck = async(): Promise<void> => {
  execSync('tsc --noEmit');
  return Promise.resolve();
};
const eslint = async(): Promise<void> => {
  const eslint = new ESLint({ baseConfig: eslintrc, fix: true, cache: true });
  const results = await eslint.lintFiles(tsconfig.include).catch((err) => {
    throw err;
  });
  await ESLint.outputFixes(results);
};

(async(): Promise<void> => {
  await Promise.all([ tscheck(), eslint() ]);
  console.log('Task `lint` has been completed.');
})();
