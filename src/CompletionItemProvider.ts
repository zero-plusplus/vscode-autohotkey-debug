import { count } from 'underscore.string';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';

export interface CompletionItemProvider extends vscode.CompletionItemProvider {
  useIntelliSenseInDebugging: boolean;
  ahkVersion: 1 | 2;
  session: dbgp.Session | null;
}

const findWord = (document: vscode.TextDocument, position: vscode.Position, ahkVersion: 1 | 2): string => {
  const temp = document.lineAt(position).text.slice(0, position.character);
  const regexp = ahkVersion === 1 ? /[\w#@$]+$/ui : /[\w]+$/ui;
  const word = temp.slice(temp.search(regexp)).trim();
  return word;
};
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

    const fixedPosition = new vscode.Position(position.line, 0 < position.character ? position.character - 1 : position.character);
    const triggerCharacter = context.triggerCharacter ?? document.getText(new vscode.Range(fixedPosition, position));
    const word = findWord(document, fixedPosition, this.ahkVersion);

    const properties = await this.session.fetchSuggestList(word);
    const fixedProperties = properties.filter((property) => {
      if (property.name.startsWith('[')) {
        return triggerCharacter === '[';
      }

      const isIndexKeyByObject = (/[\w]+\(\d+\)/ui).test(property.name);
      return !isIndexKeyByObject;
    });

    return fixedProperties.map((property): vscode.CompletionItem => {
      const completionItem = new vscode.CompletionItem(property.name);
      completionItem.kind = createKind(property);
      completionItem.insertText = property.name;
      completionItem.detail = createDetail(property);

      const depth = count(property.fullName, '.');
      const priority = property.name.startsWith('__') ? 1 : 0;
      completionItem.sortText = `@:${priority}:${depth}:${property.name}`;

      if (triggerCharacter === '[') {
        completionItem.range = {
          inserting: new vscode.Range(fixedPosition, fixedPosition),
          replacing: new vscode.Range(fixedPosition, fixedPosition),
        };
        completionItem.command = {
          title: '',
          command: 'cursorRight',
        };
        if (!property.name.startsWith('[')) {
          const fixedName = `["${property.name}"]`;
          completionItem.label = fixedName;
          completionItem.insertText = fixedName;
        }

        const nextCharPosition = new vscode.Position(position.line, position.character + 1);
        const nextChar = document.getText(new vscode.Range(position, nextCharPosition));
        if (nextChar === ']') {
          completionItem.insertText = completionItem.insertText.slice(0, -1);
        }
      }

      return completionItem;
    });
  },
} as CompletionItemProvider;
