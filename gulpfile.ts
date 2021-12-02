import * as gulp from 'gulp';
import run from 'gulp-run-command';
import * as del from 'del';
import * as webpack from 'webpack';
import { ESLint } from 'eslint';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TSConfigJSON } from 'types-tsconfig';
import eslintrc from './.eslintrc';
import webpackProduction from './webpack.production';
import webpackDevelopment from './webpack.development';
import { isDirectory } from './src/util/util';
import { spawn } from 'child_process';

const clean = async(): Promise<void> => {
  await del('./build');
};

const tscheck = async(): Promise<void> => {
  await run('tsc --noEmit')();
};
const eslint = async(): Promise<void> => {
  const tsconfig = JSON.parse(await fs.readFile('./tsconfig.json', 'utf-8')) as TSConfigJSON;

  const eslint = new ESLint({ ...eslintrc, fix: true, cache: true });
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
const runSandBoxTest = async(): Promise<void> => {
  const packageJson = JSON.parse(await fs.readFile(`${__dirname}/package.json`, 'utf-8'));
  const packageName = String(packageJson.name);
  const packageVersion = String(packageJson.version);
  const tempDir = path.resolve(`${String(process.env.USERPROFILE)}/AppData/Local/Temp`);
  const wsbDirPath = path.resolve(`${tempDir}/${String(packageJson.name)}`);
  const wsbPath = path.resolve(`${wsbDirPath}/sandbox.wsb`);

  if (isDirectory(wsbDirPath)) {
    await del(wsbDirPath, { force: true });
  }
  await fs.mkdir(wsbDirPath);
  await fs.writeFile(wsbPath, `
    <Configuration>
      <MappedFolders>
          <MappedFolder>
              <HostFolder>${wsbDirPath}</HostFolder>
          </MappedFolder>
      </MappedFolders>
      <LogonCommand>
        <Command>powershell -executionpolicy unrestricted -command "start powershell { -noexit -file C:\\Users\\WDAGUtilityAccount\\Desktop\\${packageName}\\installer.ps1 }"</Command>
      </LogonCommand>
    </Configuration>
  `);

  await fs.copyFile(`${__dirname}/${packageName}-${packageVersion}.vsix`, `${wsbDirPath}/${packageName}.vsix`);
  await fs.copy(`${__dirname}/demo`, `${wsbDirPath}/demo`);
  const installerPath = `${wsbDirPath}/installer.ps1`;
  await fs.writeFile(installerPath, `
    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:ChocolateyInstall = Convert-Path "$((Get-Command choco).path)\\..\\.."
    Import-Module "$env:ChocolateyInstall\\helpers\\chocolateyProfile.psm1"

    choco install vscode -y
    choco install autohotkey -y
    # Install autohotkey2
    Invoke-RestMethod -Uri "https://www.autohotkey.com/download/ahk-v2.zip" -OutFile "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey2.zip"
    Expand-Archive -Path "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey2.zip" -DestinationPath "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey2"
    New-Item "C:\\Program Files\\AutoHotkey\\v2" -ItemType Directory
    Copy-Item -Path "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey2\\AutoHotkey64.exe" -Destination "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey.exe"

    refreshenv
    code --install-extension slevesque.vscode-autohotkey
    code --install-extension dudelmoser.vscode-autohotkey2
    code --install-extension C:\\Users\\WDAGUtilityAccount\\Desktop\\${packageName}\\${packageName}.vsix
    code C:\\Users\\WDAGUtilityAccount\\Desktop\\${packageName}\\demo

    exit
  `);
  spawn('WindowsSandBox', [ wsbPath ], { detached: true });
};

const buildWithoutClean = gulp.parallel(lint, buildMain);
const build = gulp.series(clean, buildWithoutClean);
const bundleWithoutClean = gulp.parallel(bundleMain);
const bundle = gulp.series(clean, bundleWithoutClean);
const bundleDebugWithoutClean = gulp.parallel(bundleMainDebug);
const bundleDebug = gulp.series(clean, bundleDebugWithoutClean);
const vscePackage = async(): Promise<void> => {
  await run('vsce package')();
};
const watchMain = async(): Promise<void> => {
  return run('tsc -w')();
};
const watch = gulp.series(build, watchMain);
const packaging = gulp.series(clean, gulp.parallel(lint, vscePackage));
const testBySandBox = gulp.series(packaging, runSandBoxTest);

export {
  build,
  buildWithoutClean,
  buildMain,
  bundle,
  bundleWithoutClean,
  bundleDebug,
  bundleDebugWithoutClean,
  runSandBoxTest,
  testBySandBox,
  watch,
  packaging,
  clean,
  lint,
  tscheck,
  eslint,
};
