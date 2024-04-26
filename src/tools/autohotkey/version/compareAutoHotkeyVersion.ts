import { LiteralUnion } from 'type-fest';
import { ParsedAutoHotkeyVersion, preIdList } from '../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from './parseAutoHotkeyVersion';

export const compareAutoHotkeyVersion = (a: string | ParsedAutoHotkeyVersion, b: string | ParsedAutoHotkeyVersion): number => {
  const version_a = typeof a === 'string' ? parseAutoHotkeyVersion(a) : a;
  const version_b = typeof b === 'string' ? parseAutoHotkeyVersion(b) : b;

  const mejorDiff = version_a.mejor - version_b.mejor;
  if (mejorDiff !== 0) {
    return mejorDiff;
  }

  const miniorDiff = version_a.minor - version_b.minor;
  if (miniorDiff !== 0) {
    return miniorDiff;
  }

  const patchDiff = version_a.patch - version_b.patch;
  if (patchDiff !== 0) {
    return patchDiff;
  }

  if ('preId' in version_a && 'preId' in version_b) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const preIdNumber_a = preIdList.indexOf(version_a.preId as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const preIdNumber_b = preIdList.indexOf(version_b.preId as any);

    const preIdDiff = preIdNumber_a - preIdNumber_b;
    if (preIdDiff !== 0) {
      return preIdDiff;
    }
  }
  if ('preId' in version_a) {
    return -1;
  }
  if ('preId' in version_b) {
    return 1;
  }
  return 0;
};
export const compareAutoHotkeyVersionByOperator = (a: string | ParsedAutoHotkeyVersion, operator: LiteralUnion<'=' | '!=' | '<' | '<=' | '>' | '>=', string>, b: string | ParsedAutoHotkeyVersion): boolean => {
  const compareResult = compareAutoHotkeyVersion(a, b);

  switch (operator) {
    case '=': return compareResult === 0;
    case '!=': return compareResult !== 0;
    case '<': return compareResult < 0;
    case '<=': return compareResult <= 0;
    case '>': return 0 < compareResult;
    case '>=': return 0 <= compareResult;
    default: break;
  }
  return false;
};
