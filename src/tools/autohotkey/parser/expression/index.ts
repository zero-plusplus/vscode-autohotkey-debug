import { Parser } from '../../../../types/tools/autohotkey/parser/common.types';
import { ParsedAutoHotkeyVersion } from '../../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../../version';
import * as v1_0 from './grammars/v1_0';

export const createParser = (ahkVersionOrText: string | ParsedAutoHotkeyVersion): Parser => {
  const ahkVersion = typeof ahkVersionOrText === 'string' ? parseAutoHotkeyVersion(ahkVersionOrText) : ahkVersionOrText;
  if (ahkVersion.mejor === 2.1) {
    return v1_0.parser;
  }
  if (ahkVersion.mejor === 2.0) {
    return v1_0.parser;
  }
  return v1_0.parser;
};
