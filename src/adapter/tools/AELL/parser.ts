/* eslint-disable no-sync */
import ohm from 'ohm-js';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { toAST } from 'ohm-js/extras';
import { Node, SyntaxKind } from '../../../types';

export const grammarText_v1 = `
  Expression_for_v1 {
    Expression
      = Expression "," ExpressionWithoutSequence -- comma_sequence
      | ExpressionWithoutSequence

    ExpressionWithoutSequence
      = AssignmentExpression

    AssignmentExpression
      = AssignmentExpression ":=" ReAssignmentExpression -- assign
      | ReAssignmentExpression

    ReAssignmentExpression
      = ReAssignmentExpression "+=" TernaryExpression -- addition
      | ReAssignmentExpression "-=" TernaryExpression -- subtraction
      | ReAssignmentExpression "*=" TernaryExpression -- multiplication
      | ReAssignmentExpression "/=" TernaryExpression -- division
      | ReAssignmentExpression "//=" TernaryExpression -- floor_division
      | ReAssignmentExpression ".=" TernaryExpression -- concatenate
      | ReAssignmentExpression "|=" TernaryExpression -- bitwise_or
      | ReAssignmentExpression "^=" TernaryExpression -- bitwise_xor
      | ReAssignmentExpression "&=" TernaryExpression -- bitwise_and
      | ReAssignmentExpression "<<=" TernaryExpression -- bitshift_left
      | ReAssignmentExpression ">>=" TernaryExpression -- bitshift_right
      | ReAssignmentExpression ">>>=" TernaryExpression -- bitshift_logical_right
      | TernaryExpression

    TernaryExpression
      = TernaryExpression "?" LogicalOrExpression ":" LogicalOrExpression -- ternary
      | LogicalOrExpression

    LogicalOrExpression
      = LogicalOrExpression "||" LogicalAndExpression -- or
      | LogicalAndExpression

    LogicalAndExpression
      = LogicalAndExpression "&&" EqualityExpression -- and
      | EqualityExpression

    EqualityExpression
      = EqualityExpression "=" RelationalExpression -- loose_equal
      | EqualityExpression "==" RelationalExpression -- equal
      | EqualityExpression "!=" RelationalExpression -- not_loose_equal
      | EqualityExpression "!==" RelationalExpression -- not_equal
      | RelationalExpression

    RelationalExpression
      = RelationalExpression "<" RegExMatchExpression -- lessthan
      | RelationalExpression "<=" RegExMatchExpression -- lessthan_equal
      | RelationalExpression ">" RegExMatchExpression -- greaterthan
      | RelationalExpression ">=" RegExMatchExpression -- greaterthan_equal
      | RegExMatchExpression

    RegExMatchExpression
      = RegExMatchExpression "~=" ConcatenateExpression -- regex_match
      | ConcatenateExpression

    ConcatenateExpression
      = ConcatenateExpression #(whitespace) BitwiseExpression -- space
      | ConcatenateExpression #(&space) "." #(&space) BitwiseExpression -- dot
      | BitwiseExpression

    BitwiseExpression
      = BitwiseExpression "|" ~"|" BitshiftExpression -- or
      | BitwiseExpression "^" BitshiftExpression -- xor
      | BitwiseExpression "&" ~"&" BitshiftExpression -- and
      | BitshiftExpression

    BitshiftExpression
      = BitshiftExpression "<<" AdditiveExpression -- left
      | BitshiftExpression ">>" AdditiveExpression -- right
      | BitshiftExpression ">>>" AdditiveExpression -- logical_right
      | AdditiveExpression

    AdditiveExpression
      = AdditiveExpression "+" MultiplicativeExpression -- addition
      | AdditiveExpression "-" MultiplicativeExpression -- subtraction
      | MultiplicativeExpression

    MultiplicativeExpression
      = MultiplicativeExpression "*" MultiplicativeExpression -- multiplication
      | MultiplicativeExpression "/" MultiplicativeExpression -- division
      | MultiplicativeExpression "//" MultiplicativeExpression -- floor_division
      | ExponentiationExpression

    ExponentiationExpression
      = ExponentiationExpression "**" MemberExpression -- power
      | UnaryExpression

    UnaryExpression
      = "++" UnaryExpression -- increment
      | "--" UnaryExpression -- decrement
      | "+" UnaryExpression -- positive
      | "-" UnaryExpression -- negative
      | "!" UnaryExpression -- not
      | "&" ~"&" UnaryExpression -- address
      | "~" UnaryExpression -- bitwise_not
      | "*" UnaryExpression -- dereference
      | PostfixUnaryExpression

    PostfixUnaryExpression
      = PostfixUnaryExpression "++" -- increment
      | PostfixUnaryExpression "--" -- decrement
      | CallExpression

    CallExpression
      = CallExpression "." #(identifier)  -- propertyaccess
      | CallExpression #(whitespace* "[") Arguments "]" -- elementaccess
      | CallExpression "(" Arguments ")" -- call
      | MemberExpression
    Arguments = ListOf<ExpressionWithoutSequence, ",">

    MemberExpression
      = MemberExpression "." #(identifier) -- propertyaccess
      | MemberExpression #(whitespace* "[") Arguments "]" -- elementaccess
      | PrimaryExpression

    PrimaryExpression
      = identifier
      | literal
      | DereferenceExpressions
      | ParenthesizedExpression

    ParenthesizedExpression = "(" Expression ")"
    DereferenceExpressions = (#(identifier) | DereferenceExpression)+
    DereferenceExpression = #("%" identifier "%")

    whitespace = " " | "\\t"
    lineTerminator
      = "\\r\\n"
      | "\\n"

    identifier = identifierStart identifierPart*
    identifierStart = letter | "_" | "$" | "@" | "#"
    identifierPart = identifierStart | digit

    literal
      = stringLiteral
      | numericLiteral

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
  }
`;

export const grammarText_v2 = `
  Expression_for_v2 <: Expression_for_v1 {
    DereferenceExpression := #("%") Expression #("%")

    MemberExpression
      := MemberExpression "." #(identifier) -- propertyaccess
       | MemberExpression "." DereferenceExpressions -- dereference_propertyaccess
       | MemberExpression #(whitespace* "[") Arguments "]" -- elementaccess
       | PrimaryExpression

    stringLiteral
      := "\\"" doubleCharacter* "\\""
       | "'" singleCharacter* "'"
    doubleEscapeSequence := "\`\\"" | commonEscapeSequence
    singleEscapeSequence = "\\'" | commonEscapeSequence
    singleCharacter
      = ~("'" | "\`" | lineTerminator) any
      | doubleEscapeSequence
  }
`;

const grammar_v1 = ohm.grammar(grammarText_v1);
const grammar_v2 = ohm.grammar(grammarText_v1, ohm.grammars(grammarText_v2));
export const expressionNodeMapping = {
  Expression_comma_sequence: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  AssignmentExpression_assign: { kind: SyntaxKind.AssignExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_addition: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_subtraction: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_multiplication: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_division: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_floor_division: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_concatenate: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_bitwise_or: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_bitwise_xor: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_bitwise_and: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_bitshift_left: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_bitshift_right: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ReAssignmentExpression_bitshift_logical_right: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  LogicalOrExpression_or: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  LogicalAndExpression_and: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  EqualityExpression_loose_equal: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  EqualityExpression_not_loose_equal: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  EqualityExpression_equal: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  EqualityExpression_not_equal: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  RelationalExpression_lessthan: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  RelationalExpression_lessthan_equal: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  RelationalExpression_greaterthan: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  RelationalExpression_greaterthan_equal: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  RegExMatchExpression_regex_match: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ConcatenateExpression_space: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ConcatenateExpression_dot: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 2, right: 4 },
  BitwiseExpression_or: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  BitwiseExpression_xor: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  BitwiseExpression_and: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  BitshiftExpression_left: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  BitshiftExpression_right: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  BitshiftExpression_logical_left: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  BitshiftExpression_logical_right: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  AdditiveExpression_concatenate: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  AdditiveExpression_addition: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  AdditiveExpression_subtraction: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  MultiplicativeExpression_multiplication: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  MultiplicativeExpression_division: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  ExponentiationExpression_power: { kind: SyntaxKind.BinaryExpression, left: 0, operator: 1, right: 2 },
  DereferenceExpressions: { kind: SyntaxKind.DereferenceExpressions, dereferenceExpressions: 0 },
  DereferenceExpression: { kind: SyntaxKind.DereferenceExpression, leftPercent: 0, expression: 1, rightPercent: 2 },
  CallExpression_call: { kind: SyntaxKind.CallExpression, caller: 0, arguments: 2 },
  CallExpression_propertyaccess: { kind: SyntaxKind.PropertyAccessExpression, object: 0, property: 2 },
  CallExpression_elementaccess: { kind: SyntaxKind.ElementAccessExpression, object: 0, arguments: 3 },
  MemberExpression_propertyaccess: { kind: SyntaxKind.PropertyAccessExpression, object: 0, property: 2 },
  MemberExpression_dereference_propertyaccess: { kind: SyntaxKind.DereferencePropertyAccessExpression, object: 0, property: 2 },
  MemberExpression_elementaccess: { kind: SyntaxKind.ElementAccessExpression, object: 0, arguments: 3 },
  UnaryExpression_positive: { kind: SyntaxKind.UnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_negative: { kind: SyntaxKind.UnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_not: { kind: SyntaxKind.UnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_address: { kind: SyntaxKind.UnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_bitwise_not: { kind: SyntaxKind.UnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_dereference: { kind: SyntaxKind.UnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_increment: { kind: SyntaxKind.PrefixUnaryExpression, operator: 0, expression: 1 },
  UnaryExpression_decrement: { kind: SyntaxKind.PrefixUnaryExpression, operator: 0, expression: 1 },
  PostfixUnaryExpression_increment: { kind: SyntaxKind.PostFixUnaryExpression, expression: 0, operator: 1 },
  PostfixUnaryExpression_decrement: { kind: SyntaxKind.PostFixUnaryExpression, expression: 0, operator: 1 },
  TernaryExpression_ternary: { kind: SyntaxKind.TernaryExpression, condition: 0, whenTrue: 2, whenFalse: 4 },
  booleanLiteral: { kind: SyntaxKind.Identifier, start: 0, parts: 1 },
  identifier: { kind: SyntaxKind.Identifier, start: 0, parts: 1 },
};
export const parse = (ahkVersionOrText: string | AhkVersion, input: string): Node => {
  const ahkVersion = ahkVersionOrText instanceof AhkVersion ? ahkVersionOrText : new AhkVersion(ahkVersionOrText);

  const matchResult = 2.0 <= ahkVersion.mejor
    ? grammar_v2.match(input)
    : grammar_v1.match(input);
  if (!matchResult.succeeded()) {
    throw new ParseError(matchResult);
  }
  const node = toAST(matchResult, expressionNodeMapping) as Node;
  return node;
};

export class ParseError extends Error {
  public readonly message: string;
  public readonly shortMessage: string;
  constructor(matchResult: ohm.MatchResult) {
    super();

    this.message = matchResult.message ?? '';
    this.shortMessage = matchResult.shortMessage ?? '';
  }
  public get expected(): string {
    const message = this.message.split('\n')[3] ?? '';
    const match = message.match(/(?<=Expected\s)(?<expected>.+)$/ui);
    if (!match?.groups?.expected) {
      return '';
    }
    const expected = match.groups.expected
      .replace(/(?<!\\)"/gu, '`')
      .replace(/\\"/gu, '"');
    return `Expected ${expected}`;
  }
}
