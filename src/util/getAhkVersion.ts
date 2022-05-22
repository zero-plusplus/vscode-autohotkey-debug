import { SpawnSyncOptions, spawnSync } from 'child_process';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

export const getAhkVersion = (ahkRuntime: string, options?: SpawnSyncOptions): AhkVersion | null => {
  const ahkCode = 'FileOpen("*", "w", "CP65001").write(A_AhkVersion)';
  const result = spawnSync(ahkRuntime, [ '/ErrorStdOut', '*' ], { ...options, input: ahkCode });
  if (result.error) {
    return null;
  }
  const version = result.stdout.toString();
  return new AhkVersion(version);
};
