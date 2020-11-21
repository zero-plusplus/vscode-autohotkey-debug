import * as gulp from 'gulp';
import * as del from 'del';
import * as webpack from 'webpack';
import { ESLint } from 'eslint';
import { readFileSync } from 'fs';
import { TSConfigJSON } from 'types-tsconfig';
import eslintrc from './.eslintrc';
import webpackProduction from './webpack.production';

const clean = async(): Promise<void> => {
  await del('./build');
};

const eslint = async(): Promise<void> => {
  const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8')) as TSConfigJSON;

  const eslint = new ESLint(eslintrc);
  const results = await eslint.lintFiles(tsconfig.include!).catch((err) => {
    throw err;
  });
  await ESLint.outputFixes(results);
};

// // #region build
const buildMain = async(): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const compiler = webpack(webpackProduction);
    compiler.run((err, result) => {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      if (result) {
        if (0 < result.compilation.errors.length) {
          reject(result.compilation.errors);
          return;
        }
      }
      resolve();
    });
  });
};
// const buildMainDebug = (): NodeJS.ReadWriteStream => {
//   return gulp.src('./src/extension.ts')
//     .pipe(webpackStream({
//       ...webpackBuildMainConfig,
//       mode: 'development',
//     }))
//     .pipe(gulp.dest('./build/src/extension.js'));
// };
// const buildTest = (): NodeJS.ReadWriteStream => {
//   return gulp.src('./test/**/*.ts')
//     .pipe(webpackStream({
//       ...webpackCommonConfig,
//       mode: 'development',
//     }))
//     .pipe(gulp.dest('./build'));
// };
// // #endregion build

const buildWithoutClean = gulp.parallel(buildMain);
const build = gulp.series(clean, buildWithoutClean);
export {
  build,
  buildWithoutClean,
  buildMain,
  // buildMainDebug,
  // buildTest,
  clean,
  eslint,
};
