import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';

export interface CompletionItemProvider extends vscode.CompletionItemProvider {
  ahkVersion: 1 | 2;
  session: dbgp.Session | null;
}

const findWord = (document: vscode.TextDocument, position: vscode.Position, ahkVersion: 1 | 2): string => {
  const temp = document.lineAt(position).text.slice(0, position.character);
  const regexp = ahkVersion === 1 ? /[\w#@$.]+$/ui : /[\w.]+$/ui;
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
  if (kindName === 'class') {
    return `[${property.context.name}] (${kindName}) ${(property as dbgp.ObjectProperty).className}`;
  }

  const type = property instanceof dbgp.ObjectProperty ? property.className : property.type;
  return `[${property.context.name}] (${kindName}) ${property.fullName}: ${type}`;
};
export const completionItemProvider = {
  ahkVersion: 1,
  session: null,
  async provideCompletionItems(document, position, token, context) {
    if (!this.session) {
      return [];
    }
    else if (this.session.socketClosed) {
      this.session = null;
      return [];
    }

    const word = findWord(document, position, this.ahkVersion);
    const suggestList = await this.session.fetchSuggestList(word);
    return suggestList.map((property): vscode.CompletionItem => {
      const completionItem = new vscode.CompletionItem(property.name);
      completionItem.kind = createKind(property);
      completionItem.insertText = property.name;
      completionItem.detail = createDetail(property);
      return completionItem;
    });
  },
} as CompletionItemProvider;
