import * as gulp from 'gulp';
import run from 'gulp-run-command';
import * as del from 'del';
import * as webpack from 'webpack';
import { ESLint } from 'eslint';
import { readFileSync } from 'fs';
import { TSConfigJSON } from 'types-tsconfig';
import eslintrc from './.eslintrc';
import webpackProduction from './webpack.production';
import webpackDevelopment from './webpack.development';

const clean = async(): Promise<void> => {
  await del('./build');
};

const tscheck = async(): Promise<void> => {
  await run('tsc --noEmit')();
};
const eslint = async(): Promise<void> => {
  const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8')) as TSConfigJSON;

  const eslint = new ESLint(eslintrc);
  const results = await eslint.lintFiles(tsconfig.include!).catch((err) => {
    throw err;
  });
  await ESLint.outputFixes(results);
};
// #region build
const buildMain = async(): Promise<void> => {
  await run('tsc')();
};
// #endregion build

// #region bundle
const bundling = async(webpackConfig: webpack.Configuration): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const compiler = webpack({ ...webpackConfig });
    compiler.run((err, result) => {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      if (result) {
        if (result.hasErrors()) {
          reject(result.compilation.errors);
          return;
        }
        if (result.hasWarnings()) {
          reject(result.compilation.warnings);
        }
        console.log(result.toString());
      }
      resolve();
    });
  });
};
const bundleMain = async(): Promise<void> => {
  return bundling(webpackProduction);
};
const bundleMainDebug = async(): Promise<void> => {
  return bundling(webpackDevelopment);
};
// #endregion bundle

const lint = gulp.parallel(tscheck, eslint);
const buildWithoutClean = gulp.parallel(lint, buildMain);
const build = gulp.series(clean, buildWithoutClean);
const bundleWithoutClean = gulp.parallel(bundleMain);
const bundle = gulp.series(clean, bundleWithoutClean);
const bundleDebugWithoutClean = gulp.parallel(bundleMainDebug);
const bundleDebug = gulp.series(clean, bundleDebugWithoutClean);
const vscePackage = async(): Promise<void> => {
  await run('vsce package --yarn')();
};
const packaging = gulp.parallel(lint, vscePackage);
export {
  build,
  buildWithoutClean,
  buildMain,
  bundle,
  bundleWithoutClean,
  bundleDebug,
  bundleDebugWithoutClean,
  packaging,
  clean,
  lint,
  tscheck,
  eslint,
};
