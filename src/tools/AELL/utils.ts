import { PrimitiveProperty, Property } from '../../types/dbgp/session.types';
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

export const toNumberByProperty = (property: Property | undefined): number | undefined => {
  switch (property?.type) {
    case 'string':
    case 'integer':
    case 'float': {
      const num = Number(property.value);
      if (isNaN(num)) {
        return undefined;
      }
      return num;
    }
    default: break;
  }

  return undefined;
};
export const toBooleanByProperty = (property: Property | undefined): PrimitiveProperty => {
  if (!property) {
    return createBooleanProperty(false);
  }
  if (property.type === 'undefined') {
    return createBooleanProperty(false);
  }
  if (property.type === 'string' && (property.value === '' || property.value === '0')) {
    return createBooleanProperty(false);
  }
  if ((property.type === 'integer' || property.type === 'float') && Number(property.value) === 0) {
    return createBooleanProperty(false);
  }
  return createBooleanProperty(true);
};
export const invertBoolean = (property: Property | undefined): PrimitiveProperty => {
  const bool = toBooleanByProperty(property);
  bool.value = bool.value === '1' ? '0' : '1';
  return bool;
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
