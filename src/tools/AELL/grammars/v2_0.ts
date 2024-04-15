import * as ohm from 'ohm-js';
import { createParser } from '../../autohotkey/parser/expression/grammars/utils';
import * as v1_0 from '../../autohotkey/parser/expression/grammars/v1_0';
import * as v2_0 from '../../autohotkey/parser/expression/grammars/v2_0';

export const grammarText = `
  A2ELL <: AutoHotkey_v2_0 {
    identifier := normalIdentifier | metaIdentifier

    metaIdentifier = "<" metaIdentifierStart identifierPart* ">"
    metaIdentifierStart = "$" | identifierStart
  }
`;
// NameSubstitutionExpression := (((#(rawIdentifier) | #nameDereferenceExpression) | (#nameDereferenceExpression #(rawIdentifier))) ~#(whitespace))+

const grammar = ohm.grammar(grammarText, ohm.grammars(`${v1_0.grammarText}\r\n${v2_0.grammarText}`));
export const parser = createParser(grammar, v2_0.astMapping);
