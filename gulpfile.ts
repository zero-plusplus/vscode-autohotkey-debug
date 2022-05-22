import * as gulp from 'gulp';
import glob from 'fast-glob';
import run from 'gulp-run-command';
import del from 'del';
import * as esbuild from 'esbuild';
import { ESLint } from 'eslint';
import * as fs from 'fs-extra';
import * as path from 'path';
import tsconfig from './tsconfig.json';
import eslintrc from './.eslintrc';
import { isDirectory } from './src/util/util';
import { spawn } from 'child_process';

const clean = async(): Promise<void> => {
  await del('./build');
};

const tscheck = async(): Promise<void> => {
  await run('tsc --noEmit')();
};
const eslint = async(): Promise<void> => {
  const eslint = new ESLint({ baseConfig: eslintrc, fix: true, cache: true });
  const results = await eslint.lintFiles(tsconfig.include).catch((err) => {
    throw err;
  });
  await ESLint.outputFixes(results);
};
// #region build
const esbuildCommonOptions: esbuild.BuildOptions = {
  platform: 'node',
  format: 'cjs',
};
const esbuildOptions: esbuild.BuildOptions = {
  ...esbuildCommonOptions,
  entryPoints: [ './src/extension.ts' ],
  outfile: './build/extension.js',
  bundle: true,
  minify: true,
  treeShaking: true,
  external: [
    'vscode-uri',
    'vscode',
  ],
};
const esbuildDebugOptions: esbuild.BuildOptions = {
  ...esbuildCommonOptions,
  entryPoints: glob.sync('./src/**/*.ts'),
  outdir: 'build',
  sourcemap: true,
};
const buildMain = async(): Promise<void> => {
  await esbuild.build(esbuildOptions);
};
const buildMainDebug = async(): Promise<void> => {
  await esbuild.build(esbuildDebugOptions);
};
// #endregion build

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

    # The following will be installed last due to slow processing
    # Install autohotkey_h
    Invoke-RestMethod -Uri "https://github.com/HotKeyIt/ahkdll-v1-release/archive/master.zip" -OutFile "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h.zip"
    Expand-Archive -Path "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h.zip" -DestinationPath "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h"
    New-Item "C:\\Program Files\\AutoHotkey\\h" -ItemType Directory
    Copy-Item -Path "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h\\ahkdll-v1-release-master\\x64w_MT\\AutoHotkey.exe" -Destination "C:\\Program Files\\AutoHotkey\\h\\AutoHotkey.exe"

    # Install autohotkey_h2
    Invoke-RestMethod -Uri "https://github.com/HotKeyIt/ahkdll-v2-release/archive/master.zip" -OutFile "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h2.zip"
    Expand-Archive -Path "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h2.zip" -DestinationPath "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h2"
    New-Item "C:\\Program Files\\AutoHotkey\\h\\v2" -ItemType Directory
    Copy-Item -Path "C:\\Users\\WDAGUtilityAccount\\Downloads\\autohotkey_h2\\ahkdll-v2-release-master\\x64w_MT\\AutoHotkey.exe" -Destination "C:\\Program Files\\AutoHotkey\\h\\v2\\AutoHotkey.exe"

    exit
  `);
  spawn('WindowsSandBox', [ wsbPath ], { detached: true });
};

const buildWithoutClean = gulp.parallel(lint, buildMain);
const build = gulp.series(clean, buildWithoutClean);
const vscePackage = async(): Promise<void> => {
  await run('vsce package')();
};
const watchMain = async(): Promise<void> => {
  await esbuild.build({
    ...esbuildDebugOptions,
    incremental: true,
    watch: {
      onRebuild: (err, result) => {
        if (err) {
          console.log(`[esbuild] error: ${err.message}`);
        }
        console.log(`[esbuild] build completed`);
      },
    },
  });
};
const watch = gulp.series(clean, watchMain);
const packaging = gulp.series(clean, gulp.parallel(lint, vscePackage));
const testBySandBox = gulp.series(packaging, runSandBoxTest);

export {
  build,
  buildWithoutClean,
  buildMain,
  buildMainDebug,
  runSandBoxTest,
  testBySandBox,
  watch,
  watchMain,
  packaging,
  clean,
  lint,
  tscheck,
  eslint,
};
