import * as ohm from 'ohm-js';
import { createParser } from '../../autohotkey/parser/expression/grammars/utils';
import * as v1_0 from '../../autohotkey/parser/expression/grammars/v1_0';
import { Parser } from '../../../types/tools/autohotkey/parser/common.types';

export const grammarText = `
A1ELL <: AutoHotkey_v1_1 {
  identifier := normalIdentifier | metaIdentifier

  metaIdentifier = "<" metaIdentifierStart identifierPart* ">"
  metaIdentifierStart = "$" | identifierStart
}
`;

const grammar = ohm.grammar(grammarText, ohm.grammars(v1_0.grammarText));
export const parser: Parser = createParser(grammar, v1_0.astMapping);
