import { count } from 'underscore.string';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';
import { splitVariablePath } from './util/util';

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

    // #region util
    const fixPosition = (offset: number): vscode.Position => {
      return new vscode.Position(position.line, Math.max(position.character + offset, 0));
    };
    const fixQuote = (word: string): string => {
      if (this.ahkVersion === 1) {
        return word;
      }
      return word.replace(/`'/gu, '`"').replace(/'/gu, '"');
    };
    const findWord = (offset = 0): string => {
      const temp = document.lineAt(position).text.slice(0, fixPosition(offset).character);
      const regexp = this.ahkVersion === 1 ? /[^\s\r\n]+$/ui : /[^\s\r\n]+$/ui;
      const word = temp.slice(temp.search(regexp)).trim();
      return fixQuote(word);
    };
    const getPrevText = (length: number): string => {
      return document.getText(new vscode.Range(fixPosition(-length), position));
    };
    // #endregion util

    const word = findWord();
    const isBracketNotation = splitVariablePath(this.ahkVersion, word).pop()?.startsWith('[') ?? false;
    const triggerCharacter = context.triggerCharacter ?? getPrevText(1);

    const properties = await this.session.fetchSuggestList(word);
    const fixedProperties = properties.filter((property) => {
      if (property.isIndexKey) {
        return false;
      }
      const isIndexKeyByObject = (/[\w]+\(\d+\)/ui).test(property.name);
      if (isIndexKeyByObject) {
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

        if (!isBracketNotation && triggerCharacter === '.') {
          // Since I could not use the range property to replace the dots as shown below, I will use TextEdit
          // completionItem.range = {
          //   inserting: new vscode.Range(fixedPosition, fixedPosition),
          //   replacing: new vscode.Range(fixedPosition, position),
          // };

          // This is a strange implementation because I don't know the specs very well.
          const replaceRange = new vscode.Range(fixPosition(-1), position);
          const a = property.name.slice(0, 1);
          const b = property.name.slice(1);
          completionItem.additionalTextEdits = [ new vscode.TextEdit(replaceRange, a) ];
          completionItem.insertText = b;
        }
        else {
          completionItem.insertText = fixedLabel;
        }
      }

      return completionItem;
    });
  },
} as CompletionItemProvider;
