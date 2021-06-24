import { count } from 'underscore.string';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';
import { lastIndexOf } from './util/stringUtils';

export interface CompletionItemProvider extends vscode.CompletionItemProvider {
  useIntelliSenseInDebugging: boolean;
  ahkVersion: 1 | 2;
  session: dbgp.Session | null;
}

const createKind = (property: dbgp.Property): vscode.CompletionItemKind => {
  let kind: vscode.CompletionItemKind = property.fullName.includes('.')
    ? vscode.CompletionItemKind.Field
    : vscode.CompletionItemKind.Variable;
  if (property instanceof dbgp.ObjectProperty) {
    if (property.className === 'Func') {
      if (property.fullName.includes('.')) {
        kind = vscode.CompletionItemKind.Method;
      }
      else {
        kind = vscode.CompletionItemKind.Function;
      }
    }
    else if (property.className === 'Class') {
      kind = vscode.CompletionItemKind.Class;
    }
    else if (property.className === 'Property') {
      kind = vscode.CompletionItemKind.Property;
    }
    else if (property.name.toLowerCase() === '__new') {
      kind = vscode.CompletionItemKind.Constructor;
    }
  }
  return kind;
};
const createDetail = (property: dbgp.Property): string => {
  const kindName = vscode.CompletionItemKind[createKind(property)].toLowerCase();
  const context = property.fullName.includes('.') || property.fullName.includes('[')
    ? ''
    : `[${property.context.name}] `;
  if (kindName === 'class') {
    return `${context}(${kindName}) ${(property as dbgp.ObjectProperty).className}`;
  }

  const type = property instanceof dbgp.ObjectProperty ? property.className : property.type;
  return `${context}(${kindName}) ${property.fullName}: ${type}`;
};
export const completionItemProvider = {
  useIntelliSenseInDebugging: true,
  ahkVersion: 1,
  session: null,
  async provideCompletionItems(document, position, token, context) {
    if (!this.useIntelliSenseInDebugging) {
      return [];
    }
    if (!this.session) {
      return [];
    }
    else if (this.session.socketClosed) {
      this.session = null;
      return [];
    }


    const fixPosition = (original: vscode.Position, offset: number): vscode.Position => {
      return new vscode.Position(original.line, Math.max(original.character + offset, 0));
    };
    const findWord = (offset = 0): string => {
      const temp = document.lineAt(position).text.slice(0, fixPosition(position, offset).character);
      const regexp = this.ahkVersion === 1 ? /[\w#@$[\]."']+$/ui : /[\w[\]."']+$/ui;
      const word = temp.slice(temp.search(regexp)).trim();
      return word;
    };
    const getPrevText = (length: number): string => {
      return document.getText(new vscode.Range(fixPosition(position, -(length)), position));
    };
    const findBracketNotationOffset = (word: string): number => {
      if (word.endsWith('.')) {
        return -1;
      }

      const bracketNotationRegExp = this.ahkVersion === 2 ? /\[("|')/u : /\["/u;
      const lastQuote = lastIndexOf(word, this.ahkVersion === 2 ? /"|'/u : /"/u);
      if (-1 < lastQuote) {
        const bracketQuoteIndex = (word.length - lastQuote) + 1;
        const bracketQuote = getPrevText(bracketQuoteIndex);
        if (bracketNotationRegExp.test(bracketQuote)) {
          return bracketQuoteIndex;
        }
      }
      return -1;
    };


    const prevCharacter = context.triggerCharacter ?? getPrevText(1);
    const word = findWord();
    const bracketNotationOffset = findBracketNotationOffset(word);
    const isBracketNotation = -1 < bracketNotationOffset;

    let fixedWord = word;
    if (isBracketNotation) {
      fixedWord = findWord(-bracketNotationOffset);
    }
    else if ((/(\[|\])\s*$/u).test(word)) {
      fixedWord = '';
    }

    const properties = await this.session.fetchSuggestList(fixedWord);
    const fixedProperties = properties.filter((property) => {
      if (isBracketNotation) {
        // If the key is an object, it will look such as `[Object(9655936)]`
        const isIndexKeyByObject = (/[\w]+\(\d+\)/ui).test(property.name);
        if (isIndexKeyByObject) {
          return false;
        }
        return !property.isIndexKey;
      }
      else if (prevCharacter === '.' && property.name.startsWith('[')) {
        return false;
      }

      return true;
    });

    return fixedProperties.map((property): vscode.CompletionItem => {
      const completionItem = new vscode.CompletionItem(property.name);
      completionItem.kind = createKind(property);
      completionItem.insertText = property.name;
      completionItem.detail = createDetail(property);

      const depth = count(property.fullName, '.');
      const priority = property.name.startsWith('__') ? 1 : 0;
      completionItem.sortText = `@:${priority}:${depth}:${property.name}`;

      if (property.name.startsWith('[')) {
        const fixedLabel = property.name.replace(/^\[(")?/u, '').replace(/(")?\]$/u, '');
        completionItem.label = fixedLabel;
        completionItem.insertText = fixedLabel;
      }

      return completionItem;
    });
  },
} as CompletionItemProvider;
