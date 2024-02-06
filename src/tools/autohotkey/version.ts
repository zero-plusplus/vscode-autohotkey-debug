import { AutoHotkeyVersion, ParsedAutoHotkeyVersion, PreAutoHotkeyVersion, PreReleaseId, preIdList } from '../../types/dbgp/ExtendAutoHotkeyDebugger';
import { toNumber } from '../convert';
import { evaluateAutoHotkey } from './';

export const parseAutoHotkeyVersion = (rawVersion: AutoHotkeyVersion): ParsedAutoHotkeyVersion => {
  const [ version = '', preversion = undefined ] = rawVersion.split('-');
  const splitedVersion = version.split('.');

  const isV1Version = splitedVersion.length === 4;
  const mejor = isV1Version ? toNumber(`${splitedVersion[0]}.${splitedVersion[1]}`) : toNumber(splitedVersion[0]);
  const minor = isV1Version ? toNumber(splitedVersion[2]) : toNumber(splitedVersion[1]);
  const patch = isV1Version ? toNumber(splitedVersion[3]) : toNumber(splitedVersion[2]);

  if (!preversion) {
    return {
      raw: rawVersion,
      version: version as AutoHotkeyVersion,
      mejor,
      minor,
      patch,
    };
  }

  const splitedPreversion = preversion.split('.');
  const preId = splitedPreversion[0] as PreReleaseId;
  const preRelease = splitedPreversion.length === 2 ? Number(splitedPreversion[1]) : undefined;
  return {
    raw: rawVersion,
    version: version as AutoHotkeyVersion,
    preversion: preversion as PreAutoHotkeyVersion,
    mejor,
    minor,
    patch,
    preId,
    preRelease,
  };
};
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

