import { AutoHotkeyVersion, ParsedAutoHotkeyVersion, PreAutoHotkeyVersion, PreReleaseId } from '../../../types/dbgp/ExtendAutoHotkeyDebugger';
import { toNumber } from '../../convert';

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
