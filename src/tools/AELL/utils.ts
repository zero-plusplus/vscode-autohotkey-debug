import { PrimitiveProperty } from '../../types/dbgp/session.types';
import { EvaluatedValue } from '../../types/tools/AELL/evaluator.types';

export const createStringProperty = (value: string): PrimitiveProperty => {
  return {
    constant: false,
    fullName: '',
    name: '',
    size: value.length,
    type: 'string',
    value,
  };
};
export const createNumberProperty = (value: string | number): PrimitiveProperty => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return createNumberProperty(0);
  }

  const propertyValue = String(value);
  return {
    constant: false,
    fullName: '',
    name: '',
    size: propertyValue.length,
    value: propertyValue,
    type: propertyValue.includes('.') ? 'float' : 'integer',
  };
};
export const createBooleanProperty = (value: string | boolean): PrimitiveProperty => {
  if (typeof value === 'boolean') {
    return value ? createBooleanProperty('true') : createBooleanProperty('false');
  }
  if (value === '1') {
    return createBooleanProperty(true);
  }
  if (value === '0') {
    return createBooleanProperty(false);
  }
  if (value.toLowerCase() === 'true') {
    return {
      constant: false,
      type: 'string',
      fullName: '',
      name: '',
      size: 1,
      value: '1',
    };
  }
  if (value.toLowerCase() === 'false') {
    return {
      constant: false,
      type: 'string',
      fullName: '',
      name: '',
      size: 1,
      value: '0',
    };
  }
  return createBooleanProperty(false);
};

export const toNumberByProperty = (evaluated: EvaluatedValue): number | undefined => {
  switch (evaluated?.type) {
    case 'string':
    case 'integer':
    case 'float': {
      const num = Number(evaluated.value);
      if (isNaN(num)) {
        return undefined;
      }
      return num;
    }
    default: break;
  }

  return undefined;
};

export const calc = (leftValue: EvaluatedValue, rightValue: EvaluatedValue, callback: (a: number, b: number) => number): PrimitiveProperty => {
  const left = toNumberByProperty(leftValue);
  const right = toNumberByProperty(rightValue);

  if (left && right) {
    const calcedNumber = callback(left, right);
    return createNumberProperty(calcedNumber);
  }

  return createStringProperty('');
};
