/* eslint-disable no-sync */
import * as fs from 'fs';
import * as path from 'path';
import ohm from 'ohm-js';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

export class ExpressionParser {
  private readonly grammar: ohm.Grammar;
  private readonly ahkVersion: string | AhkVersion;
  constructor(ahkVersion: string | AhkVersion) {
    this.ahkVersion = ahkVersion instanceof AhkVersion ? ahkVersion : new AhkVersion(ahkVersion);

    const grammarPath_v1 = path.resolve(`${__dirname}/expression-for-v1.ohm`);
    const grammarPath_v2 = path.resolve(`${__dirname}/expression-for-v2.ohm`);
    this.grammar = 2.0 <= this.ahkVersion.mejor
      ? this.createGrammer(grammarPath_v2, grammarPath_v1)
      : this.createGrammer(grammarPath_v1);
  }
  public parse(text: string): ohm.MatchResult {
    return this.grammar.match(text);
  }
  private createGrammer(grammarPath: string, extendsGrammarPath?: string): ohm.Grammar {
    let extendsGrammar: ohm.Namespace | undefined;
    if (extendsGrammarPath) {
      extendsGrammar = ohm.grammars(fs.readFileSync(extendsGrammarPath, 'utf8').toString());
    }

    return ohm.grammar(fs.readFileSync(grammarPath, 'utf8'), extendsGrammar);
  }
}
