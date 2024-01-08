import * as vscode from 'vscode';
import { CompletionItemProvider } from './CompletionItemProvider';
import { registerCommands } from './commands';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { reverseSearchPair, searchPair } from './util/util';
import { ExpressionExtractor } from './util/ExpressionExtractor';
import { AhkConfigurationProvider } from './dap/ConfigurationProvider';
import { InlineDebugAdapterFactory } from './dap/DebugAdapter';

export const activate = (context: vscode.ExtensionContext): void => {
  const provider = new AhkConfigurationProvider();
  const factory = new InlineDebugAdapterFactory(provider);

  registerCommands(context);

  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('ahk', provider));
  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('autohotkey', provider));
  context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('autohotkey', factory));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider([ 'ahk', 'ahk2', 'ah2' ], new CompletionItemProvider(factory), '.'));

  const findExpressionRange = (expressionExtractor: ExpressionExtractor, document: vscode.TextDocument, position: vscode.Position, offset = 0): vscode.Range | undefined => {
    const range = document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position);

    const lineText = document.lineAt(position).text;
    const charOnCursor = lineText.at(position.character);
    if (charOnCursor === '[') {
      const pairIndex = searchPair(lineText, '[', ']');
      const range = findExpressionRange(expressionExtractor, document, new vscode.Position(position.line, position.character - 1));
      if (!range) {
        return undefined;
      }
      return new vscode.Range(range.start, new vscode.Position(position.line, pairIndex + 1));
    }
    if (charOnCursor === ']') {
      const pairIndex = reverseSearchPair(lineText, ']', '[');
      const range = findExpressionRange(expressionExtractor, document, new vscode.Position(position.line, pairIndex));
      if (!range) {
        return undefined;
      }
      return new vscode.Range(range.start, new vscode.Position(position.line, position.character + 1));
    }

    const { data, object, operator } = expressionExtractor.extract(lineText.slice(0, position.character));

    const startIndex = position.character - data.length;
    const fixedRange = new vscode.Range(new vscode.Position(position.line, startIndex), range.end);
    if (operator === '["' || operator === `['`) {
      const bracketNotation = lineText.slice(object.length + startIndex);
      const pairIndex = searchPair(bracketNotation, '[', ']');
      if (pairIndex === -1) {
        return fixedRange;
      }
      const endIndex = startIndex + object.length + pairIndex + 1;
      return new vscode.Range(
        fixedRange.start,
        new vscode.Position(fixedRange.end.line, endIndex),
      );
    }
    return fixedRange;
  };
  const expressionExtractor_v1 = new ExpressionExtractor(new AhkVersion('1.0'));
  context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider([ 'ahk' ], {
    provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
      const range = findExpressionRange(expressionExtractor_v1, document, position);
      if (!range) {
        return undefined;
      }
      return new vscode.EvaluatableExpression(range);
    },
  }));
  const expressionExtractor_v2 = new ExpressionExtractor(new AhkVersion('2.0'));
  context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider([ 'ahk2', 'ah2' ], {
    provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
      const range = findExpressionRange(expressionExtractor_v2, document, position);
      if (!range) {
        return undefined;
      }
      return new vscode.EvaluatableExpression(range);
    },
  }));
};
