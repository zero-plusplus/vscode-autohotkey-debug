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
const createSuggestList = async(session: dbgp.Session, word: string): Promise<dbgp.Property[]> => {
  const propertyName = word.includes('.')
    ? word.split('.').slice(0, -1).join('.')
    : word;

  const property = await session.fetchLatestProperty(word) ?? await session.fetchLatestProperty(propertyName);
  if (property) {
    if (property instanceof dbgp.ObjectProperty) {
      return property.children;
    }
    return [ property ];
  }

  return (await session.fetchLatestProperties()).filter((property: dbgp.Property): boolean => {
    if (property.type === 'undefined') {
      return false;
    }
    if (-1 < property.fullName.search(/[0-9]/u)) {
      return false;
    }

    if (propertyName === '') {
      return true;
    }
    if (property.fullName.toLowerCase().startsWith(propertyName.toLowerCase())) {
      return true;
    }
    return false;
  }).sort((a, b) => a.context.id - b.context.id);
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
    else if (this.session.closed) {
      this.session = null;
      return [];
    }

    const word = findWord(document, position, this.ahkVersion);
    const suggestList = await createSuggestList(this.session, word);

    return suggestList.map((property): vscode.CompletionItem => {
      const completionItem = new vscode.CompletionItem(property.name);
      completionItem.kind = createKind(property);
      completionItem.insertText = property.name;
      completionItem.detail = createDetail(property);
      return completionItem;
    });
  },
} as CompletionItemProvider;
