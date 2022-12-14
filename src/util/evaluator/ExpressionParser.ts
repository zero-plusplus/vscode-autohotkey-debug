/* eslint-disable no-sync */
import ohm from 'ohm-js';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

const grammar_v1 = `
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
      | ConcatenateExpression "." BitwiseExpression -- dot
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

    numericLiteral = "0" | decimalLiteral | hexIntegerLiteral
    digitWithoutZero = "1".."9"
    decimalLiteral = decimalIntegerLiteral
    decimalIntegerLiteral = digitWithoutZero digit*
    hexIntegerLiteral = "0x" hexDigit+
                      | "0X" hexDigit+
  }
`;

const grammar_v2 = `
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

export class ExpressionParser {
  private readonly grammar: ohm.Grammar;
  private readonly ahkVersion: string | AhkVersion;
  constructor(ahkVersion: string | AhkVersion) {
    this.ahkVersion = ahkVersion instanceof AhkVersion ? ahkVersion : new AhkVersion(ahkVersion);

    this.grammar = 2.0 <= this.ahkVersion.mejor
      ? this.createGrammer(grammar_v2, grammar_v1)
      : this.createGrammer(grammar_v1);
  }
  public parse(text: string, startRule?: string): ohm.MatchResult {
    return this.grammar.match(text, startRule);
  }
  private createGrammer(grammarText: string, extendsGrammarText?: string): ohm.Grammar {
    let extendsGrammar: ohm.Namespace | undefined;
    if (extendsGrammarText) {
      extendsGrammar = ohm.grammars(extendsGrammarText);
    }

    return ohm.grammar(grammarText, extendsGrammar);
  }
}
