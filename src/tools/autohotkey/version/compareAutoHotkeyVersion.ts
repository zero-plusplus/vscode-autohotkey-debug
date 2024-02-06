import { ParsedAutoHotkeyVersion, preIdList } from '../../../types/dbgp/ExtendAutoHotkeyDebugger';

export const compareAutoHotkeyVersion = (a: ParsedAutoHotkeyVersion, b: ParsedAutoHotkeyVersion): number => {
  const mejorDiff = a.mejor - b.mejor;
  if (mejorDiff !== 0) {
    return mejorDiff;
  }

  const miniorDiff = a.minor - b.minor;
  if (miniorDiff !== 0) {
    return miniorDiff;
  }

  const patchDiff = a.patch - b.patch;
  if (patchDiff !== 0) {
    return patchDiff;
  }

  if ('preId' in a && 'preId' in b) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const preIdNumber_a = preIdList.indexOf(a.preId as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const preIdNumber_b = preIdList.indexOf(b.preId as any);

    const preIdDiff = preIdNumber_a - preIdNumber_b;
    if (preIdDiff !== 0) {
      return preIdDiff;
    }
  }
  if ('preId' in a) {
    return -1;
  }
  if ('preId' in b) {
    return 1;
  }
  return 0;
};
