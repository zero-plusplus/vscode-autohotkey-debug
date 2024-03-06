import { LiteralUnion } from 'type-fest';

type DecimalNumber = number;
type FloatNumber = number;

export type MejorVersion = FloatNumber | DecimalNumber;
export type MinorVersion = DecimalNumber;
export type PatchVersion = DecimalNumber;
export const preIdList = [ 'alpha', 'beta', 'rc' ] as const;
export type PreReleaseId = LiteralUnion<typeof preIdList[number], string>;
export type PreReleaseVersion = DecimalNumber;
// v1: x.x.y.z | v2: x.y.z
export type PreAutoHotkeyVersion = LiteralUnion<`${PreReleaseId}.${PreReleaseVersion}`, string>;
export type AutoHotkeyVersion = LiteralUnion<`${MejorVersion}.${MinorVersion}.${PatchVersion}` | `${MejorVersion}.${MinorVersion}.${PatchVersion}-${PreAutoHotkeyVersion}`, string>;
export type ParsedAutoHotkeyVersion
  = ParsedAutoHotkeyReleasedVersion
  | ParsedAutoHotkeyPreReleasedVersion;
export interface ParsedAutoHotkeyReleasedVersion {
  raw: AutoHotkeyVersion;

  version: AutoHotkeyVersion;
  mejor: MejorVersion;
  minor: MinorVersion;
  patch: PatchVersion;
}
export interface ParsedAutoHotkeyPreReleasedVersion extends ParsedAutoHotkeyReleasedVersion {
  preversion: PreAutoHotkeyVersion;
  preId: PreReleaseId;
  preRelease: PreReleaseVersion;
}
export type ParseAutoHotkeyVersion = (a: AutoHotkeyVersion | ParsedAutoHotkeyVersion, b: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => ParsedAutoHotkeyVersion;
export type AutoHotkeyVersionCompare = (a: AutoHotkeyVersion | ParsedAutoHotkeyVersion, b: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => number;
