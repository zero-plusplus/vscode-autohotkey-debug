/* eslint-disable require-atomic-updates */
import * as path from 'path';
import { defaultAutoHotkeyInstallDir, defaultAutoHotkeyRuntimePath_v1, defaultAutoHotkeyRuntimePath_v2, defaultAutoHotkeyUxRuntimePath, getLaunchInfoByLauncher } from '../../../tools/autohotkey';
import { fileExists } from '../../../tools/predicate';
import { AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'runtime';
export const dependedAttributeName = 'program';
export const defaultValue = fileExists(defaultAutoHotkeyRuntimePath_v2)
  ? defaultAutoHotkeyRuntimePath_v2
  : defaultAutoHotkeyRuntimePath_v1;

export const validateRuntimeAttribute: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawRuntime = checker.get();
  if (rawRuntime && fileExists(rawRuntime)) {
    checker.markValidated(rawRuntime);
    return Promise.resolve();
  }

  if (await validateByRuntime_v1_v2()) {
    return Promise.resolve();
  }
  if (await validateByRuntimeOfMainScript()) {
    return Promise.resolve();
  }
  if (await validateByAutoHotkeyLauncher()) {
    return Promise.resolve();
  }
  if (await validateByCommandName()) {
    return Promise.resolve();
  }
  if (await validateByRelativePath()) {
    return Promise.resolve();
  }
  if (await validateByLanguageId()) {
    return Promise.resolve();
  }

  checker.markValidated(defaultValue);
  return Promise.resolve();

  async function getLanguageId(): Promise<string> {
    const program = checker.getDependency('program');
    return (await checker.utils?.getLanguageId?.(program))?.toLowerCase() ?? 'ahk2';
  }
  async function validateByRuntime_v1_v2(): Promise<boolean> {
    const rawRuntime_v1 = checker.ref('runtime_v1');
    const rawRuntime_v2 = checker.ref('runtime_v2');
    if (rawRuntime_v1 && rawRuntime_v2) {
      switch (await getLanguageId()) {
        case 'ahk':
        case 'ahkh': {
          checker.markValidated(rawRuntime_v1);
          return Promise.resolve(true);
        }
        case 'ahk2':
        case 'ahkh2': {
          checker.markValidated(rawRuntime_v2);
          return Promise.resolve(true);
        }
        default: {
          throw Error();
        }
      }
    }

    if (rawRuntime_v2) {
      checker.markValidated(rawRuntime_v2);
      return Promise.resolve(true);
    }
    if (rawRuntime_v1) {
      checker.markValidated(rawRuntime_v1);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
  async function validateByRuntimeOfMainScript(): Promise<boolean> {
    const program = checker.getDependency('program');
    const dirPath = path.dirname(program);
    const mainFileName = path.basename(program);
    const runtime = path.resolve(dirPath, `${mainFileName}.exe`);
    if (fileExists(runtime)) {
      checker.markValidated(runtime);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
  async function validateByAutoHotkeyLauncher(): Promise<boolean> {
    const rarRuntime = checker.get();
    if (rarRuntime) {
      return Promise.resolve(false);
    }

    if (!fileExists(defaultAutoHotkeyUxRuntimePath)) {
      return Promise.resolve(false);
    }
    const program = checker.getDependency('program');
    const info = getLaunchInfoByLauncher(program);
    if (!info) {
      return Promise.resolve(false);
    }

    if (info.runtime === '') {
      // The requires version can be obtained, but for some reason the runtime may be an empty character. In that case, set the default value
      if (info.requires) {
        const runtime = info.requires === '2' ? 'v2/AutoHotkey.exe' : 'Autohotkey.exe';
        checker.markValidated(runtime);
        return Promise.resolve(true);
      }
    }
    checker.markValidated(info.runtime);
    return Promise.resolve(true);
  }
  async function validateByCommandName(): Promise<boolean> {
    return Promise.resolve(false);
  }
  async function validateByRelativePath(): Promise<boolean> {
    const rawRuntime = checker.get();
    if (!rawRuntime) {
      return Promise.resolve(false);
    }
    if (path.isAbsolute(rawRuntime)) {
      return Promise.resolve(false);
    }

    const runtime = path.resolve(defaultAutoHotkeyInstallDir, rawRuntime);
    if (fileExists(runtime)) {
      checker.markValidated(runtime);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
  async function validateByLanguageId(): Promise<boolean> {
    const rawRuntime = checker.get();
    if (!rawRuntime) {
      return Promise.resolve(false);
    }

    const languageId = await getLanguageId();
    switch (languageId) {
      case 'ahk':
      case 'ahkh': {
        checker.markValidated(defaultAutoHotkeyRuntimePath_v1);
        return Promise.resolve(true);
      }
      case 'ahk2':
      case 'ahkh2': {
        checker.markValidated(defaultAutoHotkeyRuntimePath_v2);
        return Promise.resolve(true);
      }
      default: break;
    }
    return Promise.resolve(false);
  }
};
