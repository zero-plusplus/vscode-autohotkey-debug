import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';
import { fetchBasePropertyName } from './util/evaluator/ExpressionEvaluator';
import { AccessOperator, maskQuotes } from './util/ExpressionExtractor';
import { IntelliSense } from './util/IntelliSense';
import { equalsIgnoreCase } from './util/stringUtils';
import { searchPair } from './util/util';

export interface CompletionItemProvider extends vscode.CompletionItemProvider {
  useIntelliSenseInDebugging: boolean;
  intellisense?: IntelliSense;
}

export const toDotNotation = (ahkVersion: AhkVersion, name: string): string => {
  if (name.startsWith('[')) {
    const fixQuote = (str: string): string => str.replace(/""/gu, '`"');

    if (2 <= ahkVersion.mejor) {
      const fixedLabel = name.replace(/^\[("|')?/u, '').replace(/("|')?\]$/u, '');
      return fixQuote(fixedLabel);
    }
    const fixedLabel = name.replace(/^\[(")?/u, '').replace(/(")?\]$/u, '');
    return fixedLabel;
  }
  return name;
};
export const createCompletionLabel = (propertyName: string): string => {
  const label = propertyName;
  if (propertyName === '<base>') {
    return 'base';
  }
  return label;
};
export const createCompletionDetail = async(session: dbgp.Session, property: dbgp.Property): Promise<string> => {
  const isChildProperty = property.fullName.includes('.') || property.fullName.includes('[');
  const context = isChildProperty ? `[${property.context.name}]` : '';

  const fullName = property.fullName.replaceAll('<base>', 'base');
  if (property instanceof dbgp.ObjectProperty) {
    if (property.name === '<base>') {
      const basePropertyName = await fetchBasePropertyName(session, undefined, property, '__CLASS');
      if (basePropertyName) {
        return `${context} ${fullName}: ${basePropertyName}`;
      }
    }
    return `${context} ${fullName}: ${property.className}`;
  }

  return `${context} ${fullName}: ${property.type}`;
};
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
export const createCompletionSortText = (...params: [ dbgp.Property ] | [ string, string ]): string => {
  // const fullName = createCompletionLabel(params.length === 1 ? params[0].fullName : params[0]);
  const name = params.length === 1 ? params[0].name : params[1];

  // const depth = [ ...fullName.matchAll(/\[[^\]]+\]|\./gu) ].length;
  const orderPriority = name.match(/^(\[")?([_]*)/u)?.[0].length;
  return `@:${orderPriority ?? 0}:${name}`;
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

export const completionItemProvider = {
  useIntelliSenseInDebugging: true,
  intellisense: undefined,
  async provideCompletionItems(document, position, token, context) {
    if (!this.useIntelliSenseInDebugging) {
      return [];
    }
    if (!this.intellisense) {
      return [];
    }
    else if (this.intellisense.evaluator.session.socketClosed) {
      this.intellisense = undefined;
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
  },
} as CompletionItemProvider;
