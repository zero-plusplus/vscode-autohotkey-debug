/* eslint-disable no-sync */
import * as fs from 'fs';
import * as path from 'path';
import ohm from 'ohm-js';

export class ExpressionParser {
  private readonly grammar: ohm.Grammar;
  constructor() {
    const grammarText = fs.readFileSync(path.resolve(`${__dirname}/expression.ohm`), 'utf8').toString();
    this.grammar = ohm.grammar(grammarText);
  }
  public parse(text: string): ohm.MatchResult {
    return this.grammar.match(text);
  }
}
