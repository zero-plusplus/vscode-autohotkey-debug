import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../../types/dbgp/ExtendAutoHotkeyDebugger';
import { evaluateAutoHotkey } from '..';
import { parseAutoHotkeyVersion } from './parseAutoHotkeyVersion';

export const evaluateAhkVersion = (runtime: string): ParsedAutoHotkeyVersion | undefined => {
  try {
    const version = evaluateAutoHotkey(runtime, 'A_AhkVersion');
    if (version) {
      return parseAutoHotkeyVersion(version as AutoHotkeyVersion);
    }
  }
  catch {
  }
  return undefined;
};
