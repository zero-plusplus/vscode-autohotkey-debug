import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';
import { AccessOperator, maskQuotes } from './util/ExpressionExtractor';
import { equalsIgnoreCase } from './util/stringUtils';
import { searchPair } from './util/util';
import { createCompletionDetail, createCompletionLabel, createCompletionSortText, toDotNotation } from './util/completionUtils';
import { InlineDebugAdapterFactory } from './editors/vscode/DebugAdapterFactory';
import { IntelliSense } from './util/IntelliSense';

export const createCompletionKind = (property: dbgp.Property): vscode.CompletionItemKind => {
  if (property instanceof dbgp.ObjectProperty) {
    if (equalsIgnoreCase(property.name, '__NEW')) {
      return vscode.CompletionItemKind.Constructor;
    }
    if (property.className === 'Func') {
      return property.fullName.includes('.')
        ? vscode.CompletionItemKind.Method
        : vscode.CompletionItemKind.Function;
    }
    if (property.className === 'Class') {
      return vscode.CompletionItemKind.Class;
    }
    if (property.className === 'Property') {
      return vscode.CompletionItemKind.Property;
    }
  }
  return property.fullName.includes('.')
    ? vscode.CompletionItemKind.Field
    : vscode.CompletionItemKind.Variable;
};
export const createCompletionFixers = (ahkVersion: AhkVersion, document: vscode.TextDocument, position: vscode.Position, label: string, snippet: string, triggerCharacter: AccessOperator): Partial<vscode.CompletionItem> => {
  const fixers: Partial<vscode.CompletionItem> = {};
  if ([ '[', '["', `['` ].includes(triggerCharacter)) {
    if (2 <= ahkVersion.mejor && !label.startsWith('[')) {
      return fixers;
    }

    const beforeText = document.lineAt(position.line).text.slice(0, position.character);
    const openBracketIndex = beforeText.lastIndexOf('[');
    const spaces = beforeText.match(2 <= ahkVersion.mejor ? /\[(?<spaces>\s*)("|')?$/u : /\[(?<spaces>\s*)(")?$/u)?.groups?.spaces ?? '';

    const afterText = document.lineAt(position.line).text.slice(position.character);
    const afterText_masked = maskQuotes(ahkVersion, afterText);
    const pairIndex_close = searchPair(afterText_masked, '[', ']', 1);
    const closeBracketIndex = pairIndex_close === -1 ? position.character : position.character + (pairIndex_close + 1);

    fixers.range = new vscode.Range(
      openBracketIndex === -1 ? position : new vscode.Position(position.line, openBracketIndex),
      new vscode.Position(position.line, closeBracketIndex),
    );

    const quote = triggerCharacter === '[' ? '"' : triggerCharacter.slice(1);
    const label_dotNotation = toDotNotation(ahkVersion, label);
    fixers.insertText = `[${quote}${label_dotNotation}${quote}]`;
    fixers.label = fixers.insertText;
    fixers.filterText = `[${spaces}${quote}${label_dotNotation}${quote}]`;
    return fixers;
  }

  if (triggerCharacter === '.') {
    if (label.startsWith('[')) {
      const replaceRange = new vscode.Range(new vscode.Position(position.line, position.character - 1), position);
      fixers.additionalTextEdits = [ new vscode.TextEdit(replaceRange, '') ];
      fixers.insertText = label;
    }
  }
  return fixers;
};
export class CompletionItemProvider implements vscode.CompletionItemProvider {
  private readonly factory: InlineDebugAdapterFactory;
  constructor(factory: InlineDebugAdapterFactory) {
    this.factory = factory;
  }
  public get useIntelliSenseInDebugging(): boolean {
    return this.factory.session?.config.useIntelliSenseInDebugging ?? false;
  }
  public get intellisense(): IntelliSense | undefined {
    return this.factory.session?.intellisense;
  }
  public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {
    if (!this.useIntelliSenseInDebugging) {
      return [];
    }
    if (!this.intellisense) {
      return [];
    }
    else if (this.intellisense.evaluator.session.socketClosed) {
      return [];
    }

    const session = this.intellisense.evaluator.session;
    const ahkVersion = session.ahkVersion;
    const text = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position));
    const suggestList = (await this.intellisense.getSuggestion(text, async(property, snippet, triggerCharacter): Promise<vscode.CompletionItem> => {
      const label = createCompletionLabel(property.name);
      const completionItem: vscode.CompletionItem = {
        label,
        kind: createCompletionKind(property),
        detail: await createCompletionDetail(session, property),
        ...createCompletionFixers(ahkVersion, document, position, label, snippet, triggerCharacter),
      };
      completionItem.sortText = createCompletionSortText(property.fullName, String(completionItem.label));
      return completionItem;
    })).filter((item) => typeof item.label === 'string' && !item.label.toLocaleLowerCase().startsWith('<'));

    return suggestList;
  }
}
