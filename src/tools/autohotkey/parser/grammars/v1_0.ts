/* eslint-disable key-spacing */
import * as ohm from 'ohm-js';
import { SyntaxKind } from '../../../../types/tools/autohotkey/parser/common.types';

export const grammar = ohm.grammar(`
  AutoHotkey_v1_1 {
    SourceFile = bom? Statement* endOfFileToken

    Statement
      = Declaration
      | Expressions
      | unknown

    Declaration
      = VariableDeclaration
      | FunctionDeclaration

    _varialbeModifier = globalKeyword | localKeyword | staticKeyword
    VariableDeclaration = _varialbeModifier? NonemptyListOf<VariableDeclarator, ",">
    VariableDeclarator = identifier colonEqualsToken Expression
    FunctionDeclaration = identifier openParenToken Arguments closeParenToken

    Expressions
      = Expression
      | Expressions commaToken Expression -- comma_sequence

    Expression
      = AssignmentExpression

    AssignmentExpression
      = AssignmentExpression dotEqualsToken ReAssignmentExpression -- assign
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
      | LogicalAndExpression

    LogicalAndExpression
      = LogicalAndExpression ampersandAmpersandToken EqualityExpression -- and
      | EqualityExpression

    EqualityExpression
      = EqualityExpression equalsToken RelationalExpression -- loose_equal
      | EqualityExpression equalsEqualsToken RelationalExpression -- equal
      | EqualityExpression exclamationEqualsToken RelationalExpression -- not_loose_equal
      | EqualityExpression exclamationEqualsEqualsToken RelationalExpression -- not_equal
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
      = ConcatenateExpression #(whitespace) BitwiseExpression -- space
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
      = plusPlusToken UnaryExpression -- increment
      | minusMinusToken UnaryExpression -- decrement
      | plusToken UnaryExpression -- positive
      | minusToken UnaryExpression -- negative
      | exclamationToken UnaryExpression -- not
      | ampersandToken UnaryExpression -- address
      | tildeToken UnaryExpression -- bitwise_not
      | caretToken UnaryExpression -- bitwise_exclusive_or
      | asteriskToken UnaryExpression -- dereference
      | PostfixUnaryExpression

    PostfixUnaryExpression
      = PostfixUnaryExpression plusPlusToken -- increment
      | PostfixUnaryExpression minusMinusToken -- decrement
      | CallExpression

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
      = identifier
      | stringLiteral
      | numericLiteral
      | DereferenceExpression
      | NameSubstitutionExpression
      | ParenthesizedExpression

    ParenthesizedExpression = openParenToken Expressions closeParenToken
    NameSubstitutionExpression = ((#(rawIdentifier) | #nameDereferenceExpression) ~#(whitespace))+
    DereferenceExpression = #nameDereferenceExpression
    nameDereferenceExpression = #(percentToken rawIdentifier percentToken)

    whitespace = " " | "\\t"
    lineTerminator
      = "\\r\\n"
      | "\\n"

    identifier = rawIdentifier ~percentToken
    rawIdentifier = normalIdentifier | metaIdentifier
    normalIdentifier = identifierStart identifierPart*
    identifierStart = letter | "_" | "$" | "@" | "#" ~ "%"
    identifierPart = identifierStart | digit

    metaIdentifier = "<" metaIdentifierStart identifierPart* ">"
    metaIdentifierStart = "$" | identifierStart

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
    ampersandToken = "&"
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
    exclamationEqualsEqualsToken = "!=="
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
    endOfFileToken = end

    unknown = any
    bom = "\\uFEFF"
  }
`);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const astMapping = (() => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const token = (kind: SyntaxKind) => ({ kind, text, startPosition, endPosition, type: undefined });
  const binaryExpression = { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2, startPosition, endPosition };
  const mapping = {
    SourceFile:                                         { kind: SyntaxKind.SourceFile, bom: 0, statements: 1, endOfFile: 2 },
    VariableDeclaration:                                { kind: SyntaxKind.VariableDeclaration, modifier: 0, declarators: 1 },
    VariableDeclarator:                                 { kind: SyntaxKind.VariableDeclarator, name: 0, operator: 1, initializer: 2 },
    // AssignmentExpression_assign:                        binaryExpression,
    // ReAssignmentExpression_addition:                    assignExpression,
    // ReAssignmentExpression_subtraction:                 assignExpression,
    // ReAssignmentExpression_multiplication:              assignExpression,
    // ReAssignmentExpression_division:                    assignExpression,
    // ReAssignmentExpression_floor_division:              assignExpression,
    // ReAssignmentExpression_concatenate:                 assignExpression,
    // ReAssignmentExpression_bitwise_or:                  assignExpression,
    // ReAssignmentExpression_bitwise_xor:                 assignExpression,
    // ReAssignmentExpression_bitwise_and:                 assignExpression,
    // ReAssignmentExpression_bitshift_left:               assignExpression,
    // ReAssignmentExpression_bitshift_right:              assignExpression,
    // ReAssignmentExpression_bitshift_logical_right:      assignExpression,
    // #region binary
    Expression_comma_sequence:                          binaryExpression,
    LogicalOrExpression_or:                             binaryExpression,
    LogicalAndExpression_and:                           binaryExpression,
    EqualityExpression_loose_equal:                     binaryExpression,
    EqualityExpression_not_loose_equal:                 binaryExpression,
    EqualityExpression_equal:                           binaryExpression,
    EqualityExpression_not_equal:                       binaryExpression,
    RelationalExpression_lessthan:                      binaryExpression,
    RelationalExpression_lessthan_equal:                binaryExpression,
    RelationalExpression_greaterthan:                   binaryExpression,
    RelationalExpression_greaterthan_equal:             binaryExpression,
    RegExMatchExpression_regex_match:                   binaryExpression,
    ConcatenateExpression_space:                        binaryExpression,
    ConcatenateExpression_dot:                          binaryExpression,
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
    NameSubstitutionExpression:                         { kind: SyntaxKind.NameSubstitutionExpression, value: text, text, startPosition, endPosition },
    DereferenceExpression:                              { kind: SyntaxKind.DereferenceExpression, value: text, text, startPosition, endPosition },
    CallExpression_call:                                { kind: SyntaxKind.CallExpression, caller: 0, arguments: 2, startPosition, endPosition },
    CallExpression_propertyaccess:                      { kind: SyntaxKind.PropertyAccessExpression, object: 0, property: 2, startPosition, endPosition },
    CallExpression_elementaccess:                       { kind: SyntaxKind.ElementAccessExpression, object: 0, arguments: 3, startPosition, endPosition },
    MemberExpression_propertyaccess:                    { kind: SyntaxKind.PropertyAccessExpression, object: 0, property: 2, startPosition, endPosition },
    MemberExpression_dereference_propertyaccess:        { kind: SyntaxKind.DereferencePropertyAccessExpression, object: 0, property: 2, startPosition, endPosition },
    MemberExpression_elementaccess:                     { kind: SyntaxKind.ElementAccessExpression, object: 0, arguments: 3, startPosition, endPosition },
    UnaryExpression_positive:                           { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_negative:                           { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_not:                                { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_address:                            { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_bitwise_not:                        { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_bitwise_exclusive_or:               { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_dereference:                        { kind: SyntaxKind.UnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_increment:                          { kind: SyntaxKind.PreFixUnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    UnaryExpression_decrement:                          { kind: SyntaxKind.PreFixUnaryExpression, operator: 0, operand: 1, startPosition, endPosition },
    PostfixUnaryExpression_increment:                   { kind: SyntaxKind.PostFixUnaryExpression, operand: 0, operator: 1, startPosition, endPosition },
    PostfixUnaryExpression_decrement:                   { kind: SyntaxKind.PostFixUnaryExpression, operand: 0, operator: 1, startPosition, endPosition },
    TernaryExpression_ternary:                          { kind: SyntaxKind.TernaryExpression, condition: 0, whenTrue: 2, whenFalse: 4, startPosition, endPosition },
    stringLiteral:                                      { kind: SyntaxKind.StringLiteral, value: slicedText(1, -1), text, startPosition, endPosition },
    numericLiteral:                                     { kind: SyntaxKind.NumberLiteral, value: (nodes: ohm.Node[]): number => Number(text(nodes)), text, startPosition, endPosition },
    identifier:                                         { kind: identifierKind, value: identifierValue, text, startPosition, endPosition },
    // #endregion primary
    // #region keyword
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
    bom:                                                token(SyntaxKind.Bom),
    // #endregion token
  };
  return mapping;

  function identifierKind(nodes: ohm.Node[]): SyntaxKind {
    const identifierName = text(nodes);
    switch (identifierName.toLowerCase()) {
      case 'true':
      case 'false':
        return SyntaxKind.BooleanLiteral;
      default: break;
    }
    return SyntaxKind.Identifier;
  }
  function identifierValue(nodes: ohm.Node[]): string | boolean {
    const identifierName = text(nodes);
    switch (identifierName.toLowerCase()) {
      case 'true': return true;
      case 'false': return false;
      default: break;
    }
    return text(nodes);
  }
  function slicedText(start: number, end?: number) {
    return (nodes: ohm.Node[]): string => {
      return text(nodes.slice(start, end));
    };
  }
  function text(nodes: ohm.Node[]): string {
    return nodes.map((node) => node.source.contents).join('');
  }
  function startPosition(nodes: ohm.Node[]): number {
    const firstNode = nodes.at(0);
    return firstNode?.source.startIdx ?? 0;
  }
  function endPosition(nodes: ohm.Node[]): number {
    const firstNode = nodes.at(0);
    const lastNode = nodes.at(-1);
    return lastNode?.source.endIdx ?? firstNode?.source.endIdx ?? 0;
  }
})();
