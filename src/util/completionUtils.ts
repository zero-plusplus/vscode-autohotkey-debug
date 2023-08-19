import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import * as dbgp from '../dbgpSession';
import { fetchBasePropertyName } from './evaluator/ExpressionEvaluator';

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
export const createCompletionSortText = (...params: [ dbgp.Property ] | [ string, string ]): string => {
  // const fullName = createCompletionLabel(params.length === 1 ? params[0].fullName : params[0]);
  const name = params.length === 1 ? params[0].name : params[1];

  // const depth = [ ...fullName.matchAll(/\[[^\]]+\]|\./gu) ].length;
  const orderPriority = name.match(/^(\[")?([_]*)/u)?.[0].length;
  return `@:${orderPriority ?? 0}:${name}`;
};
