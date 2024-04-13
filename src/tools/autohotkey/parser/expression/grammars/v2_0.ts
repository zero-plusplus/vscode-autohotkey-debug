/* eslint-disable key-spacing */
import * as ohm from 'ohm-js';
import { createAstMappingUtils, createParser } from './utils';
import * as v1_0 from './v1_0';
import { SyntaxKind } from '../../../../../types/tools/autohotkey/parser/common.types';

export const grammarText = `
  AutoHotkey_v2_0 <: AutoHotkey_v1_1 {
    DereferenceExpression := ~rawIdentifier percentToken ~percentToken Expressions percentToken

    EqualityExpression
      := EqualityExpression equalsToken RelationalExpression -- loose_equal
       | EqualityExpression equalsEqualsToken RelationalExpression -- equal
       | EqualityExpression exclamationEqualsToken RelationalExpression -- not_loose_equal
       | EqualityExpression exclamationEqualsEqualsToken RelationalExpression -- not_equal
       | RelationalExpression

    identifierStart := (letter | "_")

    stringLiteral := doubleStringLiteral | singleStringLiteral
    doubleStringLiteral = "\\"" doubleCharacter* "\\""
    singleStringLiteral = "'" singleCharacter* "'"
    singleCharacter
      = ~("\\'" | "\`" | lineTerminator) any
      | singleEscapeSequence
    singleEscapeSequence = "\`'" | commonEscapeSequence
    doubleEscapeSequence := "\`\\"" | commonEscapeSequence

    lessThanGreaterThanToken :=
    exclamationEqualsEqualsToken = "!=="
  }
`;
export const grammar = ohm.grammar(grammarText, ohm.grammars(v1_0.grammarText));

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const astMapping = (() => {
  const {
    endPosition,
    slicedText,
    startPosition,
    text,
  } = createAstMappingUtils();

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const mapping = {
    ...v1_0.astMapping,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    stringLiteral:  { kind: SyntaxKind.StringLiteral, value: (nodes: ohm.Node[]) => slicedText(1, -1)(nodes[0].children), text, startPosition, endPosition },
  };
  return mapping;
})();
export const parser = createParser(grammar, astMapping);
