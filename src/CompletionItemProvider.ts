import { count } from 'underscore.string';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';
import { lastIndexOf } from './util/stringUtils';
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
    const findWord = (offset = 0): string => {
      const targetText = document.lineAt(position).text.slice(0, fixPosition(offset).character);
      const chars = targetText.split('').reverse();
      const openBracketIndex = lastIndexOf(targetText, this.ahkVersion === 2 ? /(?<=\[)("|')/u : /(?<=\[)(")/u);
      const closeBracketIndex = lastIndexOf(targetText, this.ahkVersion === 2 ? /("|')(?=\])/u : /"(?=\])/u);

      const result: string[] = [];
      let quote = '', bracketCount = 0;
      if (closeBracketIndex < openBracketIndex) {
        quote = targetText.charAt(openBracketIndex);
        bracketCount = 1;
      }
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const nextChar = chars[i + 1] as string | undefined;

        if (quote) {
          if (this.ahkVersion === 2) {
            if (char === '"' && nextChar === '`') {
              result.push(char);
              result.push('"');
              i++;
              continue;
            }

            if (quote === `'` && char === '"') {
              result.push('"');
              result.push('"');
              continue;
            }
            else if (quote === `'` && char === `'`) {
              result.push('"');
              quote = '';
              continue;
            }
          }


          if (quote === char) {
            result.push(quote);
            quote = '';
            continue;
          }
          result.push(char);
          continue;
        }
        else if (0 < bracketCount && char === '[') {
          result.push(char);
          bracketCount--;
          continue;
        }

        switch (char) {
          case `'`: {
            if (this.ahkVersion === 2) {
              quote = char;
              result.push('"');
              continue;
            }
            result.push(char);
            continue;
          }
          case '"': {
            quote = char;
            result.push(char);
            continue;
          }
          case ']': {
            result.push(char);
            bracketCount++;
            continue;
          }
          case '.': {
            result.push(char);
            continue;
          }
          default: {
            const isIdentifierChar = (this.ahkVersion === 2 ? /[\w_]/u : /[\w_$@#]/u).test(char);
            if (isIdentifierChar) {
              result.push(char);
              continue;
            }
          }
        }
        break;
      }
      return result.reverse().join('');
    };
    const getPrevText = (length: number): string => {
      return document.getText(new vscode.Range(fixPosition(-length), position));
    };
    // #endregion util

    const word = findWord();
    const lastWordPathPart = splitVariablePath(this.ahkVersion, word).pop() ?? '';
    const isBracketNotation = lastWordPathPart.startsWith('[');
    const triggerCharacter = context.triggerCharacter ?? getPrevText(1);

    const properties = await this.session.fetchSuggestList(word);
    const fixedProperties = properties.filter((property) => {
      if (isBracketNotation && property.name.startsWith('[') && !property.fullName.toLocaleLowerCase().startsWith(word.toLowerCase())) {
        return false;
      }
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
        const fixQuote = (str: string): string => {
          return str.replace(/""/gu, '`"');
        };
        const fixLabel = (label: string): string => {
          const fixedLabel = label.replace(/^\[(")?/u, '').replace(/(")?\]$/u, '');
          return this.ahkVersion === 2 ? fixQuote(fixedLabel) : fixedLabel;
        };

        const fixedLabel = fixLabel(property.name);
        completionItem.label = fixedLabel;

        if (!isBracketNotation && triggerCharacter === '.') {
          // Since I could not use the range property to replace the dots as shown below, I will use TextEdit
          // completionItem.range = {
          //   inserting: new vscode.Range(fixedPosition, fixedPosition),
          //   replacing: new vscode.Range(fixedPosition, position),
          // };

          // This is a strange implementation because I don't know the specs very well.
          const replaceRange = new vscode.Range(fixPosition(-1), position);
          const fixedPropertyName = fixQuote(property.name);
          const a = fixedPropertyName.slice(0, 1);
          const b = fixedPropertyName.slice(1);
          completionItem.additionalTextEdits = [ new vscode.TextEdit(replaceRange, a) ];
          completionItem.insertText = b;
        }
        else if (lastWordPathPart.startsWith('[')) {
          const fixedLastWordPathPart = fixLabel(lastWordPathPart);
          completionItem.insertText = fixedLabel.slice(fixedLastWordPathPart.length);
          completionItem.range = new vscode.Range(position, position);
        }
        else {
          completionItem.insertText = fixedLabel;
        }
      }

      return completionItem;
    });
  },
} as CompletionItemProvider;
