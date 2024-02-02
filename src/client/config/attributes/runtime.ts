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
  await validateRuntimeAttributeByFileExists(createChecker);
  await validateRuntimeAttributeByRuntime_v1_v2(createChecker);
  await validateRuntimeAttributeByRuntimeOfMainScript(createChecker);
  await validateRuntimeAttributeByAutoHotkeyLauncher(createChecker);
  await validateRuntimeAttributeByCommandName(createChecker);
  await validateRuntimeAttributeByRelativePath(createChecker);
  await validateRuntimeAttributeByLanguageId(createChecker);

  const checker = createChecker(attributeName);
  if (!checker.isValid) {
    checker.markValidatedPath(defaultValue);
  }
  return Promise.resolve();
};

export const validateRuntimeAttributeByFileExists: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  const rawRuntime = checker.get();
  if (rawRuntime && fileExists(rawRuntime)) {
    checker.markValidatedPath(rawRuntime);
  }
  return Promise.resolve();
};
export const validateRuntimeAttributeByRuntime_v1_v2: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  const rawRuntime_v1 = checker.ref('runtime_v1');
  const rawRuntime_v2 = checker.ref('runtime_v2');
  if (rawRuntime_v1 && rawRuntime_v2) {
    const program = checker.getDependency('program');

    const languageId = await checker.utils?.getLanguageId?.(program);
    switch (languageId) {
      case 'ahk':
      case 'ahkh': {
        checker.markValidatedPath(rawRuntime_v1);
        return Promise.resolve();
      }
      case 'ahk2':
      case 'ahkh2': {
        checker.markValidatedPath(rawRuntime_v2);
        return Promise.resolve();
      }
      default: break;
    }
  }

  if (rawRuntime_v2) {
    checker.markValidatedPath(rawRuntime_v2);
    return Promise.resolve();
  }
  if (rawRuntime_v1) {
    checker.markValidatedPath(rawRuntime_v1);
    return Promise.resolve();
  }
  return Promise.resolve();
};
export const validateRuntimeAttributeByRuntimeOfMainScript: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  const program = checker.getDependency('program');
  const dirPath = path.dirname(program);
  const mainFileName = path.basename(program);
  const runtime = path.resolve(dirPath, `${mainFileName}.exe`);
  if (fileExists(runtime)) {
    checker.markValidatedPath(runtime);
    return Promise.resolve();
  }
  return Promise.resolve();
};
export const validateRuntimeAttributeByAutoHotkeyLauncher: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  const rarRuntime = checker.get();
  if (!rarRuntime) {
    return Promise.resolve();
  }

  if (!fileExists(defaultAutoHotkeyUxRuntimePath)) {
    return Promise.resolve();
  }
  const program = checker.getDependency('program');
  const info = getLaunchInfoByLauncher(program);
  if (!info) {
    return Promise.resolve();
  }

  if (info.runtime === '') {
    // The requires version can be obtained, but for some reason the runtime may be an empty character. In that case, set the default value
    if (info.requires) {
      const runtime = info.requires === '2' ? 'v2/AutoHotkey.exe' : 'Autohotkey.exe';
      checker.markValidatedPath(runtime);
      return Promise.resolve();
    }
  }

  if (fileExists(info.runtime)) {
    checker.markValidatedPath(info.runtime);
  }
  return Promise.resolve();
};
export const validateRuntimeAttributeByCommandName: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  return Promise.resolve();
};
export const validateRuntimeAttributeByRelativePath: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  const rawRuntime = checker.get();
  if (!rawRuntime) {
    return Promise.resolve();
  }
  if (path.isAbsolute(rawRuntime)) {
    return Promise.resolve();
  }

  const runtime = path.resolve(defaultAutoHotkeyInstallDir, rawRuntime);
  if (fileExists(runtime)) {
    checker.markValidatedPath(runtime);
    return Promise.resolve();
  }
  return Promise.resolve();
};
export const validateRuntimeAttributeByLanguageId: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);
  if (checker.isValid) {
    return Promise.resolve();
  }

  const rawRuntime = checker.get();
  if (!rawRuntime) {
    return Promise.resolve();
  }

  const program = checker.getDependency('program');
  const languageId = await checker.utils?.getLanguageId?.(program);
  switch (languageId) {
    case 'ahk':
    case 'ahkh': {
      checker.markValidatedPath(defaultAutoHotkeyRuntimePath_v1);
      return Promise.resolve();
    }
    case 'ahk2':
    case 'ahkh2': {
      checker.markValidatedPath(defaultAutoHotkeyRuntimePath_v2);
      return Promise.resolve();
    }
    default: break;
  }
  return Promise.resolve();
};
