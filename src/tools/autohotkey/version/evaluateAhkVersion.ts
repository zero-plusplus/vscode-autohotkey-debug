import { evaluateAutoHotkey } from '..';
import { ParsedAutoHotkeyVersion } from '../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from './parseAutoHotkeyVersion';

export const evaluateAhkVersion = (runtime: string): ParsedAutoHotkeyVersion | undefined => {
  try {
    const version = evaluateAutoHotkey(runtime, 'A_AhkVersion');
    if (version) {
      return parseAutoHotkeyVersion(version);
    }
  }
  catch {
  }
  return undefined;
};
