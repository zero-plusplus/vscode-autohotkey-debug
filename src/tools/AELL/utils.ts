import { BooleanValue, EvaluatedValue, NumberValue, StringValue } from '../../types/tools/AELL/evaluator.types';
import { SyntaxKind } from '../../types/tools/autohotkey/parser/common.types';

export const createStringValue = (value: string, quoteOrText = '"'): StringValue => {
  const quote = [ `"`, `'` ].includes(quoteOrText.charAt(0)) ? quoteOrText.charAt(0) : '"';
  return {
    kind: SyntaxKind.StringLiteral,
    type: 'string',
    value,
    text: `${quote}${value}${quote}`,
  };
};
export const createNumberValue = (value: string | number): NumberValue => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return createNumberValue(0);
  }

  const text = String(value);
  return {
    kind: SyntaxKind.NumberLiteral,
    value: numValue,
    text,
    type: text.includes('.') ? 'float' : 'integer',
  };
};
export const createBooleanValue = (value: string | boolean): BooleanValue => {
  if (typeof value === 'boolean') {
    return value ? createBooleanValue('true') : createBooleanValue('false');
  }
  if (value === '1') {
    return createBooleanValue(true);
  }
  if (value === '0') {
    return createBooleanValue(false);
  }
  if (value.toLowerCase() === 'true') {
    const text = value;
    return {
      kind: SyntaxKind.BooleanLiteral,
      type: 'string',
      value: '1',
      text,
      bool: true,
    };
  }
  if (value.toLowerCase() === 'false') {
    const text = value;
    return {
      kind: SyntaxKind.BooleanLiteral,
      type: 'string',
      value: '0',
      text,
      bool: false,
    };
  }
  return createBooleanValue(false);
};

export const toNumberValue = (value: EvaluatedValue): NumberValue | undefined => {
  if (!value) {
    return undefined;
  }
  if (!('kind' in value)) {
    return undefined;
  }
  switch (value.kind) {
    case SyntaxKind.StringLiteral:
    case SyntaxKind.BooleanLiteral: {
      const num = Number(value.value);
      if (isNaN(num)) {
        return undefined;
      }
      return createNumberValue(num);
    }
    case SyntaxKind.NumberLiteral: return value;
    default: break;
  }

  return undefined;
};

export const calc = (leftValue: EvaluatedValue, rightValue: EvaluatedValue, callback: (a: number, b: number) => number): NumberValue | StringValue => {
  const left = toNumberValue(leftValue);
  const right = toNumberValue(rightValue);

  if (left?.kind === SyntaxKind.NumberLiteral && right?.kind === SyntaxKind.NumberLiteral) {
    const calcedNumber = callback(left.value, right.value);
    return createNumberValue(calcedNumber);
  }

  return createStringValue('');
};
