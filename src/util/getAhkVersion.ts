import { SpawnSyncOptions, spawnSync } from 'child_process';

export interface Version {
  full: string;
  mejor: number;
  minor: number;
  teeny: number;
  patch: number;
  alpha: number | null;
}
export class AhkVersion {
  public readonly full: string;
  public readonly mejor: number;
  public readonly minor: number;
  public readonly teeny: number;
  public readonly patch: number;
  public readonly alpha: number;
  constructor(version: string) {
    const splitedVersion = version.split('.');
    const alphaMatch = version.match(/-(?:a(\d+)|alpha)/u);
    let alpha;
    if (alphaMatch) {
      alpha = typeof alphaMatch[1] === 'undefined' ? 0 : parseInt(alphaMatch[1], 10); // Note: AutoHotkey_H does not have the alpha code set. It is always `2.0-alpha`
    }

    this.full = version;
    this.mejor = parseInt(splitedVersion[0], 10);
    this.minor = parseInt(splitedVersion[1], 10);
    this.teeny = typeof alpha === 'undefined' ? parseInt(splitedVersion[2], 10) : 0;
    this.patch = typeof alpha === 'undefined' ? parseInt(splitedVersion[3], 10) : 0;
    this.alpha = alpha;
  }
}

export const getAhkVersion = (ahkRuntime: string, options?: SpawnSyncOptions): AhkVersion | null => {
  const ahkCode = 'FileOpen("*", "w").write(A_AhkVersion)';
  const result = spawnSync(ahkRuntime, [ '/ErrorStdOut', '*' ], { ...options, input: ahkCode });
  if (result.error) {
    return null;
  }
  const version = result.stdout.toString();
  return new AhkVersion(version);
};
