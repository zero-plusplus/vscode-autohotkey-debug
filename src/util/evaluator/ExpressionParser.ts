/* eslint-disable no-sync */
import * as fs from 'fs';
import * as path from 'path';
import ohm from 'ohm-js';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

export class ExpressionParser {
  private readonly version: AhkVersion;
  private readonly grammar: ohm.Grammar;
  constructor(version: string | AhkVersion) {
    this.version = typeof version === 'string' ? new AhkVersion(version) : version;
    const grammarFileName = this.version.mejor === 1.1
      ? 'expression_for_v1.ohm'
      : 'expression_for_v2.ohm';
    const grammarText = fs.readFileSync(path.resolve(`${__dirname}/${grammarFileName}`), 'utf8').toString();
    this.grammar = ohm.grammar(grammarText);
  }
  public parse(text: string): ohm.MatchResult {
    return this.grammar.match(text);
  }
}
