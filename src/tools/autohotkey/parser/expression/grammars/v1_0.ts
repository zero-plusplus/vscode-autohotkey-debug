/* eslint-disable key-spacing */
import * as ohm from 'ohm-js';
import { DereferenceExpression, Identifier, SyntaxKind } from '../../../../../types/tools/autohotkey/parser/common.types';
import { createAstMappingUtils, createParser } from './utils';

export const grammarText = `
  AutoHotkey_v1_1 {
    _Program = VariableDeclaration | Expressions

    _varialbeModifier = globalKeyword | localKeyword | staticKeyword
    VariableDeclaration = _varialbeModifier NonemptyListOf<VariableDeclarator, ",">
    VariableDeclarator = identifier colonEqualsToken Expression

    Expressions
      = Expression ~commaToken
      | NonemptyListOf<Expression, commaToken> -- comma_sequence

    Expression
      = AssignmentExpression

    AssignmentExpression
      = AssignmentExpression colonEqualsToken ReAssignmentExpression -- assign
      | AssignmentExpression dotEqualsToken ReAssignmentExpression -- concatenate
      | ReAssignmentExpression

    ReAssignmentExpression
      = ReAssignmentExpression plusEqualsToken TernaryExpression -- addition
      | ReAssignmentExpression minusEqualsToken TernaryExpression -- subtraction
      | ReAssignmentExpression asteriskEqualsToken TernaryExpression -- multiplication
      | ReAssignmentExpression slashEqualsToken TernaryExpression -- division
      | ReAssignmentExpression slashSlashEqualsToken TernaryExpression -- floor_division
      | ReAssignmentExpression dotEqualsToken TernaryExpression -- concatenate
      | ReAssignmentExpression barEqualsToken TernaryExpression -- bitwise_or
      | ReAssignmentExpression caretEqualsToken TernaryExpression -- bitwise_xor
      | ReAssignmentExpression ampersandEqualToken TernaryExpression -- bitwise_and
      | ReAssignmentExpression lessThanLessThanEqualsToken TernaryExpression -- bitshift_left
      | ReAssignmentExpression greaterThanGreaterThanEqualsToken TernaryExpression -- bitshift_right
      | ReAssignmentExpression greaterThanGreaterThanGreaterThanEqualsToken TernaryExpression -- bitshift_logical_right
      | TernaryExpression

    TernaryExpression
      = TernaryExpression questionToken LogicalOrExpression colonToken LogicalOrExpression -- ternary
      | LogicalOrExpression

    LogicalOrExpression
      = LogicalOrExpression barBarToken LogicalAndExpression -- or
      | LogicalOrExpression orKeyword LogicalAndExpression -- or_keyword
      | LogicalAndExpression

    LogicalAndExpression
      = LogicalAndExpression ampersandAmpersandToken EqualityExpression -- and
      | LogicalAndExpression andKeyword EqualityExpression -- and_keyword
      | EqualityExpression

    EqualityExpression
      = EqualityExpression equalsToken RelationalExpression -- loose_equal
      | EqualityExpression equalsEqualsToken RelationalExpression -- equal
      | EqualityExpression exclamationEqualsToken RelationalExpression -- not_loose_equal
      | EqualityExpression lessThanGreaterThanToken RelationalExpression -- not_loose_equal_old
      | RelationalExpression

    RelationalExpression
      = RelationalExpression lessThanToken RegExMatchExpression -- lessthan
      | RelationalExpression lessThanEqualsToken RegExMatchExpression -- lessthan_equal
      | RelationalExpression greaterThanToken RegExMatchExpression -- greaterthan
      | RelationalExpression greaterThanEqualsToken RegExMatchExpression -- greaterthan_equal
      | RegExMatchExpression

    RegExMatchExpression
      = RegExMatchExpression tildeEqualsToken ConcatenateExpression -- regex_match
      | ConcatenateExpression

    ConcatenateExpression
      = ~#(notKeyword) ConcatenateExpression #implicitConcatenateToken BitwiseExpression -- space
      | ConcatenateExpression #(&space) dotToken #(&space) BitwiseExpression -- dot
      | BitwiseExpression

    BitwiseExpression
      = BitwiseExpression barToken BitshiftExpression -- or
      | BitwiseExpression caretToken BitshiftExpression -- xor
      | BitwiseExpression ampersandToken BitshiftExpression -- and
      | BitshiftExpression

    BitshiftExpression
      = BitshiftExpression lessThanLessThanToken AdditiveExpression -- left
      | BitshiftExpression greaterThanGreaterThanToken AdditiveExpression -- right
      | BitshiftExpression greaterThanGreaterThanGreaterThanToken AdditiveExpression -- logical_right
      | AdditiveExpression

    AdditiveExpression
      = AdditiveExpression plusToken MultiplicativeExpression -- addition
      | AdditiveExpression minusToken MultiplicativeExpression -- subtraction
      | MultiplicativeExpression

    MultiplicativeExpression
      = MultiplicativeExpression asteriskToken MultiplicativeExpression -- multiplication
      | MultiplicativeExpression slashToken MultiplicativeExpression -- division
      | MultiplicativeExpression slashSlashToken MultiplicativeExpression -- floor_division
      | ExponentiationExpression

    ExponentiationExpression
      = ExponentiationExpression asteriskAsteriskToken MemberExpression -- power
      | UnaryExpression

    UnaryExpression
      = notKeyword UnaryExpression -- not_keyword
      | plusToken UnaryExpression -- positive
      | minusToken UnaryExpression -- negative
      | exclamationToken UnaryExpression -- not
      | ampersandToken UnaryExpression -- address
      | tildeToken UnaryExpression -- bitwise_not
      | caretToken UnaryExpression -- bitwise_exclusive_or
      | asteriskToken UnaryExpression -- dereference
      | PrefixUnaryExpression

    PrefixUnaryExpression
      = plusPlusToken PostfixUnaryExpression -- increment
      | minusMinusToken PostfixUnaryExpression -- decrement
      | PostfixUnaryExpression

    PostfixUnaryExpression
      = LeftHandSideExpression plusPlusToken -- increment
      | LeftHandSideExpression minusMinusToken -- decrement
      | LeftHandSideExpression

    LeftHandSideExpression
      = CallExpression
      | NewExpression

    NewExpression
      = MemberExpression
      | newKeyword NewExpression -- new

    CallExpression
      = CallExpression dotToken #(identifier)  -- propertyaccess
      | CallExpression ~whitespace openBracketToken Arguments closeBracketToken -- elementaccess
      | CallExpression openParenToken Expressions closeParenToken -- call
      | MemberExpression
    Arguments = ListOf<Expression, commaToken>

    MemberExpression
      = MemberExpression dotToken identifier -- propertyaccess
      | MemberExpression ~whitespace openBracketToken Arguments closeBracketToken -- elementaccess
      | PrimaryExpression

    PrimaryExpression
      = stringLiteral
      | numericLiteral
      | DereferenceExpression
      | NameSubstitutionExpression
      | identifier
      | ParenthesizedExpression

    ParenthesizedExpression = openParenToken Expressions closeParenToken
    DereferenceExpression = ~identifier #nameDereferenceExpression ~identifier
    NameSubstitutionExpression = #((((identifier &nameDereferenceExpression) | (nameDereferenceExpression &identifier)))+ (identifier ~percentToken | nameDereferenceExpression ~identifier))
    nameDereferenceExpression = #(percentToken identifier percentToken)

    whitespace = " " | "\\t"
    lineTerminator
      = "\\r\\n"
      | "\\n"

    identifier = normalIdentifier
    normalIdentifier = identifierStart identifierPart*
    identifierStart = letter | "_" | "$" | "@" | "#"
    identifierPart = identifierStart | digit

    stringLiteral = "\\"" doubleCharacter* "\\""
    commonEscapeSequence = "\`\`" | "\`," | "\`%" | "\`;" | "\`::" | "\`r" | "\`n" | "\`b" | "\`t" | "\`v" | "\`a" | "\`f"
    doubleEscapeSequence = "\\"\\"" | commonEscapeSequence
    doubleCharacter
      = ~("\\"" | "\`" | lineTerminator) any
      | doubleEscapeSequence

    numericLiteral
      = hexIntegerLiteral
      | scientificNotationLiteral
      | floatLiteral
      | integerLiteral
    digitWithoutZero = "1".."9"
    integerLiteral
      = digitWithoutZero digit* -- non_zero
      | "0" -- zero
    floatLiteral = integerLiteral "." digit* -- float
    scientificNotationLiteral = floatLiteral ("e" | "E") ("+" | "-")? digit+ -- scientific_notation
    hexIntegerLiteral = "0" ("x" | "X") hexDigit+

    andKeyword = caseInsensitive<"and"> ~identifierPart
    breakKeyword = caseInsensitive<"break"> ~identifierPart
    caseKeyword = caseInsensitive<"case"> ~identifierPart
    catchKeyword = caseInsensitive<"catch"> ~identifierPart
    continueKeyword = caseInsensitive<"continue"> ~identifierPart
    elseKeyword = caseInsensitive<"else"> ~identifierPart
    finallyKeyword = caseInsensitive<"finally"> ~identifierPart
    forKeyword = caseInsensitive<"for"> ~identifierPart
    globalKeyword = caseInsensitive<"global"> ~identifierPart
    gotoKeyword = caseInsensitive<"goto"> ~identifierPart
    ifKeyword = caseInsensitive<"if"> ~identifierPart
    localKeyword = caseInsensitive<"local"> ~identifierPart
    loopKeyword = caseInsensitive<"loop"> ~identifierPart
    newKeyword = caseInsensitive<"new"> ~identifierPart
    notKeyword = caseInsensitive<"not"> (~identifierPart)
    orKeyword = caseInsensitive<"or"> ~identifierPart
    returnKeyword = caseInsensitive<"return"> ~identifierPart
    staticKeyword = caseInsensitive<"static"> ~identifierPart
    switchKeyword = caseInsensitive<"switch"> ~identifierPart
    throwKeyword = caseInsensitive<"throw"> ~identifierPart
    tryKeyword = caseInsensitive<"try"> ~identifierPart
    untilKeyword = caseInsensitive<"until"> ~identifierPart
    whileKeyword = caseInsensitive<"while"> ~identifierPart

    plusToken = "+"
    plusPlusToken = "++"
    plusEqualsToken = "+="
    minusToken = "-"
    minusMinusToken = "--"
    minusEqualsToken = "-="
    asteriskToken = "*"
    asteriskAsteriskToken = "**"
    asteriskEqualsToken = "*="
    slashToken = "/"
    slashSlashToken = "//"
    slashEqualsToken = "/="
    slashSlashEqualsToken = "//="
    colonToken = ":"
    colonEqualsToken = ":="
    commaToken = ","
    equalsToken = "="
    equalsEqualsToken = "=="
    equalsGreaterThanToken = "=>"
    dotToken = "."
    dotEqualsToken = ".="
    barToken = "|"
    barBarToken = "||"
    barEqualsToken = "|="
    ampersandToken = "&" ~("&" | "=")
    ampersandAmpersandToken = "&&"
    ampersandEqualToken = "&="
    caretToken = "^"
    caretEqualsToken = "^="
    lessThanToken = "<"
    lessThanEqualsToken = "<="
    lessThanLessThanToken = "<<"
    lessThanLessThanEqualsToken = "<<="
    lessThanGreaterThanToken = "<>"
    greaterThanToken = ">"
    greaterThanGreaterThanToken = ">>"
    greaterThanGreaterThanEqualsToken = ">>="
    greaterThanGreaterThanGreaterThanToken = ">>>"
    greaterThanGreaterThanGreaterThanEqualsToken = ">>>="
    greaterThanEqualsToken = ">="
    tildeToken = "~"
    tildeEqualsToken = "~="
    exclamationToken = "!"
    exclamationEqualsToken = "!="
    percentToken = "%"
    semiColonToken = ";"
    questionToken = "?"
    questionQuestionToken = "??"
    questionQuestionEqualsToken = "??="
    openParenToken = "("
    openBracketToken = "["
    openBraceToken = "{"
    closeParenToken = ")"
    closeBracketToken = "]"
    closeBraceToken = "}"

    implicitConcatenateToken = #space ~#(andKeyword | orKeyword)
    endOfFileToken = end
  }
`;
export const grammar = ohm.grammar(grammarText);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const astMapping = (() => {
  const {
    endPosition,
    identifierKind,
    identifierValue,
    slicedText,
    startPosition,
    text,
  } = createAstMappingUtils();
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const token = (kind: SyntaxKind) => ({ kind, text, startPosition, endPosition, type: undefined });
  const assignExpression = { kind: SyntaxKind.AssignExpression, left: 0, operator: 1, right: 2, startPosition, endPosition };
  const binaryExpression = { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2, startPosition, endPosition };

  const mapping = {
    VariableDeclaration:                                { kind: SyntaxKind.VariableDeclaration, modifier: 0, declarators: 1 },
    VariableDeclarator:                                 { kind: SyntaxKind.VariableDeclarator, name: 0, operator: 1, initializer: 2 },
    AssignmentExpression_assign:                        assignExpression,
    AssignmentExpression_concatenate:                   assignExpression,
    ReAssignmentExpression_addition:                    assignExpression,
    ReAssignmentExpression_subtraction:                 assignExpression,
    ReAssignmentExpression_multiplication:              assignExpression,
    ReAssignmentExpression_division:                    assignExpression,
    ReAssignmentExpression_floor_division:              assignExpression,
    ReAssignmentExpression_concatenate:                 assignExpression,
    ReAssignmentExpression_bitwise_or:                  assignExpression,
    ReAssignmentExpression_bitwise_xor:                 assignExpression,
    ReAssignmentExpression_bitwise_and:                 assignExpression,
    ReAssignmentExpression_bitshift_left:               assignExpression,
    ReAssignmentExpression_bitshift_right:              assignExpression,
    ReAssignmentExpression_bitshift_logical_right:      assignExpression,
    // #region binary
    Expressions_comma_sequence:                         { kind: SyntaxKind.SequenceExpression, expressions: 0 },
    LogicalOrExpression_or:                             binaryExpression,
    LogicalOrExpression_or_keyword:                     binaryExpression,
    LogicalAndExpression_and:                           binaryExpression,
    LogicalAndExpression_and_keyword:                   binaryExpression,
    EqualityExpression_loose_equal:                     binaryExpression,
    EqualityExpression_not_loose_equal:                 binaryExpression,
    EqualityExpression_not_loose_equal_old:             binaryExpression,
    EqualityExpression_equal:                           binaryExpression,
    EqualityExpression_not_equal:                       binaryExpression,
    RelationalExpression_lessthan:                      binaryExpression,
    RelationalExpression_lessthan_equal:                binaryExpression,
    RelationalExpression_greaterthan:                   binaryExpression,
    RelationalExpression_greaterthan_equal:             binaryExpression,
    RegExMatchExpression_regex_match:                   binaryExpression,
    ConcatenateExpression_space:                        binaryExpression,
    ConcatenateExpression_dot:                          { kind: SyntaxKind.BinaryExpression, left: 0, operator: 2, right: 4, startPosition, endPosition },
    BitwiseExpression_or:                               binaryExpression,
    BitwiseExpression_xor:                              binaryExpression,
    BitwiseExpression_and:                              binaryExpression,
    BitshiftExpression_left:                            binaryExpression,
    BitshiftExpression_right:                           binaryExpression,
    BitshiftExpression_logical_left:                    binaryExpression,
    BitshiftExpression_logical_right:                   binaryExpression,
    AdditiveExpression_concatenate:                     binaryExpression,
    AdditiveExpression_addition:                        binaryExpression,
    AdditiveExpression_subtraction:                     binaryExpression,
    MultiplicativeExpression_multiplication:            binaryExpression,
    MultiplicativeExpression_division:                  binaryExpression,
    MultiplicativeExpression_floor_division:            binaryExpression,
    ExponentiationExpression_power:                     binaryExpression,
    // #endregion binary
    // #region primary
    NameSubstitutionExpression:                         { kind: SyntaxKind.NameSubstitutionExpression, expressions: extraceNameSubstitutionExpressions, startPosition, endPosition },
    DereferenceExpression:                              { kind: SyntaxKind.DereferenceExpression, expression: 0, startPosition, endPosition },
    CallExpression_call:                                { kind: SyntaxKind.CallExpression, caller: 0, arguments: 2, startPosition, endPosition },
    CallExpression_propertyaccess:                      { kind: SyntaxKind.PropertyAccessExpression, object: 0, property: 2, startPosition, endPosition },
    CallExpression_elementaccess:                       { kind: SyntaxKind.ElementAccessExpression, object: 0, elements: 2, startPosition, endPosition },
    MemberExpression_propertyaccess:                    { kind: SyntaxKind.PropertyAccessExpression, object: 0, property: 2, startPosition, endPosition },
    MemberExpression_dereference_propertyaccess:        { kind: SyntaxKind.DereferencePropertyAccessExpression, object: 0, property: 2, startPosition, endPosition },
    MemberExpression_elementaccess:                     { kind: SyntaxKind.ElementAccessExpression, object: 0, elements: 2, startPosition, endPosition },
    UnaryExpression_positive:                           { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_negative:                           { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_not:                                { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_not_keyword:                        { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_address:                            { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_bitwise_not:                        { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_bitwise_exclusive_or:               { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_dereference:                        { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    PrefixUnaryExpression_increment:                    { kind: SyntaxKind.PrefixUnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    PrefixUnaryExpression_decrement:                    { kind: SyntaxKind.PrefixUnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    PostfixUnaryExpression_increment:                   { kind: SyntaxKind.PostfixUnaryExpression, operand: 0, operator: 1, startPosition, endPosition },
    PostfixUnaryExpression_decrement:                   { kind: SyntaxKind.PostfixUnaryExpression, operand: 0, operator: 1, startPosition, endPosition },
    TernaryExpression_ternary:                          { kind: SyntaxKind.TernaryExpression, condition: 0, whenTrue: 2, whenFalse: 4, startPosition, endPosition },
    stringLiteral:                                      { kind: SyntaxKind.StringLiteral, value: slicedText(1, -1), text, startPosition, endPosition },
    numericLiteral:                                     { kind: SyntaxKind.NumberLiteral, value: (nodes: ohm.Node[]): number => Number(text(nodes)), text, startPosition, endPosition },
    identifier:                                         { kind: identifierKind, value: identifierValue, text, startPosition, endPosition },
    // #endregion primary
    // #region keyword
    andKeyword:                                         token(SyntaxKind.AndKeyword),
    breakKeyword:                                       token(SyntaxKind.BreakKeyword),
    caseKeyword:                                        token(SyntaxKind.CaseKeyword),
    catchKeyword:                                       token(SyntaxKind.CatchKeyword),
    continueKeyword:                                    token(SyntaxKind.ContinueKeyword),
    elseKeyword:                                        token(SyntaxKind.ElseKeyword),
    finallyKeyword:                                     token(SyntaxKind.FinallyKeyword),
    forKeyword:                                         token(SyntaxKind.ForKeyword),
    globalKeyword:                                      token(SyntaxKind.GlobalKeyword),
    gotoKeyword:                                        token(SyntaxKind.GotoKeyword),
    ifKeyword:                                          token(SyntaxKind.IfKeyword),
    localKeyword:                                       token(SyntaxKind.LocalKeyword),
    loopKeyword:                                        token(SyntaxKind.LoopKeyword),
    newKeyword:                                         token(SyntaxKind.NewKeyword),
    notKeyword:                                         token(SyntaxKind.NotKeyword),
    orKeyword:                                          token(SyntaxKind.OrKeyword),
    returnKeyword:                                      token(SyntaxKind.ReturnKeyword),
    staticKeyword:                                      token(SyntaxKind.StaticKeyword),
    switchKeyword:                                      token(SyntaxKind.SwitchKeyword),
    throwKeyword:                                       token(SyntaxKind.ThrowKeyword),
    tryKeyword:                                         token(SyntaxKind.TryKeyword),
    untilKeyword:                                       token(SyntaxKind.UntilKeyword),
    whileKeyword:                                       token(SyntaxKind.WhileKeyword),
    // #endregion keyword
    // #region token
    endOfFileToken:                                     token(SyntaxKind.EndOfFileToken),
    plusToken:                                          token(SyntaxKind.PlusToken),
    plusPlusToken:                                      token(SyntaxKind.PlusPlusToken),
    plusEqualsToken:                                    token(SyntaxKind.PlusEqualsToken),
    minusToken:                                         token(SyntaxKind.MinusToken),
    minusMinusToken:                                    token(SyntaxKind.MinusMinusToken),
    minusEqualsToken:                                   token(SyntaxKind.MinusEqualsToken),
    asteriskToken:                                      token(SyntaxKind.AsteriskToken),
    asteriskAsteriskToken:                              token(SyntaxKind.AsteriskAsteriskToken),
    asteriskEqualsToken:                                token(SyntaxKind.AsteriskEqualsToken),
    slashToken:                                         token(SyntaxKind.SlashToken),
    slashSlashToken:                                    token(SyntaxKind.SlashSlashToken),
    slashEqualsToken:                                   token(SyntaxKind.SlashEqualsToken),
    slashSlashEqualsToken:                              token(SyntaxKind.SlashSlashEqualsToken),
    colonToken:                                         token(SyntaxKind.ColonToken),
    colonEqualsToken:                                   token(SyntaxKind.ColonEqualsToken),
    commaToken:                                         token(SyntaxKind.CommaToken),
    equalsToken:                                        token(SyntaxKind.EqualsToken),
    equalsEqualsToken:                                  token(SyntaxKind.EqualsEqualsToken),
    equalsGreaterThanToken:                             token(SyntaxKind.EqualsGreaterThanToken),
    dotToken:                                           token(SyntaxKind.DotToken),
    dotEqualsToken:                                     token(SyntaxKind.DotEqualsToken),
    barToken:                                           token(SyntaxKind.BarToken),
    barBarToken:                                        token(SyntaxKind.BarBarToken),
    barEqualsToken:                                     token(SyntaxKind.BarEqualsToken),
    ampersandToken:                                     token(SyntaxKind.AmpersandToken),
    ampersandAmpersandToken:                            token(SyntaxKind.AmpersandAmpersandToken),
    ampersandEqualToken:                                token(SyntaxKind.AmpersandEqualToken),
    caretToken:                                         token(SyntaxKind.CaretToken),
    caretEqualsToken:                                   token(SyntaxKind.CaretEqualsToken),
    lessThanToken:                                      token(SyntaxKind.LessThanToken),
    lessThanEqualsToken:                                token(SyntaxKind.LessThanEqualsToken),
    lessThanLessThanToken:                              token(SyntaxKind.LessThanLessThanToken),
    lessThanLessThanEqualsToken:                        token(SyntaxKind.LessThanLessThanEqualsToken),
    lessThanGreaterThanToken:                           token(SyntaxKind.LessThanGreaterThanToken),
    greaterThanToken:                                   token(SyntaxKind.GreaterThanToken),
    greaterThanGreaterThanToken:                        token(SyntaxKind.GreaterThanGreaterThanToken),
    greaterThanGreaterThanEqualsToken:                  token(SyntaxKind.GreaterThanGreaterThanEqualsToken),
    greaterThanGreaterThanGreaterThanToken:             token(SyntaxKind.GreaterThanGreaterThanGreaterThanToken),
    greaterThanGreaterThanGreaterThanEqualsToken:       token(SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken),
    greaterThanEqualsToken:                             token(SyntaxKind.GreaterThanEqualsToken),
    tildeToken:                                         token(SyntaxKind.TildeToken),
    tildeEqualsToken:                                   token(SyntaxKind.TildeEqualsToken),
    exclamationToken:                                   token(SyntaxKind.ExclamationToken),
    exclamationEqualsToken:                             token(SyntaxKind.ExclamationEqualsToken),
    exclamationEqualsEqualsToken:                       token(SyntaxKind.ExclamationEqualsEqualsToken),
    percentToken:                                       token(SyntaxKind.PercentToken),
    semiColonToken:                                     token(SyntaxKind.SemiColonToken),
    questionToken:                                      token(SyntaxKind.QuestionToken),
    questionQuestionToken:                              token(SyntaxKind.QuestionQuestionToken),
    questionQuestionEqualsToken:                        token(SyntaxKind.QuestionQuestionEqualsToken),
    openParenToken:                                     token(SyntaxKind.OpenParenToken),
    openBracketToken:                                   token(SyntaxKind.OpenBracketToken),
    openBraceToken:                                     token(SyntaxKind.OpenBraceToken),
    closeParenToken:                                    token(SyntaxKind.CloseParenToken),
    closeBracketToken:                                  token(SyntaxKind.CloseBracketToken),
    closeBraceToken:                                    token(SyntaxKind.CloseBraceToken),
    implicitConcatenateToken:                           token(SyntaxKind.ImplicitConcatenateToken),
    bom:                                                token(SyntaxKind.Bom),
    // #endregion token
  };
  return mapping;

  function extraceNameSubstitutionExpressions(nodes: ohm.Node[]): Array<Identifier | DereferenceExpression> {
    return [
      ...(nodes.at(0)?.children.map((child) => extraceNameSubstitutionExpression(child)) ?? []),
      ...(nodes.at(-1)?.children.map((child) => extraceNameSubstitutionExpression(child)) ?? []),
    ];
  }
  function extraceNameSubstitutionExpression(node: ohm.Node): Identifier | DereferenceExpression {
    if (node.ctorName === 'nameDereferenceExpression') {
      return {
        kind: SyntaxKind.DereferenceExpression,
        startPosition: startPosition([ node ]),
        endPosition: endPosition([ node ]),
        expression: extraceNameSubstitutionExpression(node.children[1]),
      };
    }
    return {
      kind: SyntaxKind.Identifier,
      startPosition: startPosition([ node ]),
      endPosition: endPosition([ node ]),
      text: text([ node ]),
    };
  }
})();

export const parser = createParser(grammar, astMapping);
