import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { count } from 'underscore.string';
import * as vscode from 'vscode';
import * as dbgp from './dbgpSession';
import { CaseInsensitiveMap } from './util/CaseInsensitiveMap';
import { ExpressionEvaluator, fetchInheritedProperties, getContexts } from './util/evaluator/ExpressionEvaluator';
import { lastIndexOf } from './util/stringUtils';
import { splitVariablePath } from './util/util';

export interface CompletionItemProvider extends vscode.CompletionItemProvider {
  useIntelliSenseInDebugging: boolean;
  evaluator?: ExpressionEvaluator;
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

export const fixPosition = (position: vscode.Position, offset: number): vscode.Position => {
  return new vscode.Position(position.line, Math.max(position.character + offset, 0));
};
export const findWord = (ahkVersion: AhkVersion, document: vscode.TextDocument, position: vscode.Position, offset = 0): string => {
  const targetText = document.lineAt(position).text.slice(0, fixPosition(position, offset).character);
  const chars = targetText.split('').reverse();
  const openBracketIndex = lastIndexOf(targetText, 2 <= ahkVersion.mejor ? /(?<=\[\s*)("|')/u : /(?<=\[\s*)(")/u);
  const closeBracketIndex = lastIndexOf(targetText, 2 <= ahkVersion.mejor ? /("|')\s*(?=\])/u : /"\s*(?=\])/u);

  const result: string[] = [];
  let quote = '', bracketCount = 0;
  if (-1 < openBracketIndex && closeBracketIndex < openBracketIndex) {
    quote = targetText.charAt(openBracketIndex);
    bracketCount = 1;
  }
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const nextChar = chars[i + 1] as string | undefined;

    if (quote) {
      if (2 < ahkVersion.mejor) {
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
        if (2 <= ahkVersion.mejor) {
          quote = char;
          result.push(quote);
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
        const isIdentifierChar = (2 <= ahkVersion.mejor ? /[\w_]/u : /[\w_$@#]/u).test(char);
        if (isIdentifierChar) {
          result.push(char);
          continue;
        }

        // Skip spaces
        if (0 < bracketCount && (/\s/u).test(char)) {
          continue;
        }
      }
    }
    break;
  }
  return result.reverse().join('');
};
export const fetchAllProperties = async(session: dbgp.Session): Promise<dbgp.Property[]> => {
  const contexts = await getContexts(session);
  if (!contexts) {
    return [];
  }

  const propertyMap = new CaseInsensitiveMap<string, dbgp.Property>();
  for await (const context of contexts) {
    const { properties } = await session.sendContextGetCommand(context);
    properties.forEach((property) => {
      if (propertyMap.has(property.fullName)) {
        return;
      }
      propertyMap.set(property.fullName, property);
    });
  }
  return Array.from(propertyMap.entries()).map(([ key, property ]) => property);
};
export const fetchSuggestItems = async(evaluator: ExpressionEvaluator, word: string): Promise<dbgp.Property[]> => {
  const operatorRegExp = 2.0 <= evaluator.session.ahkVersion.mejor
    ? /(?<operator>(?<=\w)\[\s*("|')?|(?<=\w|\])\.)$/u
    : /(?<operator>(?<=\w)\[\s*(")?|(?<=\w|\])\.)$/u;
  const match = word.match(operatorRegExp);
  if (!match?.groups?.operator) {
    return fetchAllProperties(evaluator.session);
  }
  const operator = match.groups.operator.replace(/\s/gu, '') as '[' | '["' | `['` | '.';
  if (operator === '[') {
    return fetchAllProperties(evaluator.session);
  }
  const expression = word.replace(operatorRegExp, '');
  const result = await evaluator.eval(expression);
  if (result instanceof dbgp.ObjectProperty) {
    return fetchInheritedProperties(evaluator.session, undefined, result);
  }
  return fetchAllProperties(evaluator.session);
};

export const completionItemProvider = {
  useIntelliSenseInDebugging: true,
  evaluator: undefined,
  async provideCompletionItems(document, position, token, context) {
    if (!this.useIntelliSenseInDebugging) {
      return [];
    }
    if (!this.evaluator) {
      return [];
    }
    else if (this.evaluator.session.socketClosed) {
      this.evaluator = undefined;
      return [];
    }

    // #region util
    const getPrevText = (length: number): string => {
      return document.getText(new vscode.Range(fixPosition(position, -length), position));
    };
    // #endregion util

    const word = findWord(this.evaluator.session.ahkVersion, document, position);
    const lastWordPathPart = splitVariablePath(this.evaluator.session.ahkVersion, word).pop() ?? '';
    const isBracketNotation = lastWordPathPart.startsWith('[');
    const triggerCharacter = context.triggerCharacter ?? getPrevText(1);

    const properties = await fetchSuggestItems(this.evaluator, word);
    const fixedProperties = properties.filter((property) => {
      if (property.name === '<enum>') {
        return false;
      }
      if ((/\d+/u).test(property.name)) {
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

    const completionItems = fixedProperties.map((property): vscode.CompletionItem => {
      const completionItem = new vscode.CompletionItem(property.name.replace(/<|>/gu, ''));
      completionItem.kind = createKind(property);
      completionItem.detail = createDetail(property);

      const depth = count(property.fullName, '.');
      const priority = property.name.startsWith('__') ? 1 : 0;
      completionItem.sortText = `@:${priority}:${depth}:${property.name}`;

      if (property.name.startsWith('[')) {
        const fixQuote = (str: string): string => {
          return str.replace(/""/gu, '`"');
        };
        const fixLabel = (label: string): string => {
          if (2 <= this.evaluator!.session.ahkVersion.mejor) {
            const fixedLabel = label.replace(/^\[("|')?/u, '').replace(/("|')?\]$/u, '');
            return fixQuote(fixedLabel);
          }
          const fixedLabel = label.replace(/^\[(")?/u, '').replace(/(")?\]$/u, '');
          return fixedLabel;
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
          const replaceRange = new vscode.Range(fixPosition(position, -1), position);
          const fixedPropertyName = fixQuote(property.name);
          const a = fixedPropertyName.slice(0, 1);
          const b = fixedPropertyName.slice(1);
          completionItem.additionalTextEdits = [ new vscode.TextEdit(replaceRange, a) ];
          completionItem.insertText = b;
        }
        else if (lastWordPathPart.startsWith('[')) {
          completionItem.insertText = fixLabel(property.name); // fixedLabel.slice(fixedLastWordPathPart.length);

          const fixedLastWordPathPart = fixLabel(lastWordPathPart);
          completionItem.range = new vscode.Range(fixPosition(position, -fixedLastWordPathPart.length), position);
        }
        else {
          completionItem.insertText = fixedLabel;
        }
      }

      return completionItem;
    });

    return completionItems;
  },
} as CompletionItemProvider;
