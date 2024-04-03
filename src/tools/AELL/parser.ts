import { Parser, SyntaxNode } from '../../types/tools/autohotkey/parser/common.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../autohotkey/version';
import * as v1_0 from './grammars/v1_0';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createAELLParser = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;
  const parser = ((): Parser => {
    if (2 <= version.mejor) {
      return v1_0.parser;
    }
    return v1_0.parser;
  })();

  return {
    parse: (input: string): SyntaxNode => {
      return parser.parse(input);
    },
  };
};
