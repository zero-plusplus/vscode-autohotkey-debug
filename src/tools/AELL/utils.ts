import { PrimitiveProperty, Property } from '../../types/dbgp/session.types';
import { EvaluatedValue } from '../../types/tools/AELL/evaluator.types';
import { CalcCallback } from '../../types/tools/AELL/utils.types';

export const createStringProperty = (value: string, contextId = -1, depth?: number): PrimitiveProperty => {
  return {
    contextId,
    depth,
    constant: false,
    fullName: '',
    name: '',
    size: value.length,
    type: 'string',
    value,
  };
};
export const createNumberProperty = (value: string | number, contextId = -1, depth?: number): PrimitiveProperty => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return createNumberProperty(0, contextId, depth);
  }

  const propertyValue = String(value);
  return {
    contextId,
    depth,
    constant: false,
    fullName: '',
    name: '',
    size: propertyValue.length,
    value: propertyValue,
    type: propertyValue.includes('.') ? 'float' : 'integer',
  };
};
export const createBooleanProperty = (value: string | boolean, contextId = -1, depth?: number): PrimitiveProperty => {
  if (typeof value === 'boolean') {
    return value ? createBooleanProperty('true', contextId, depth) : createBooleanProperty('false', contextId, depth);
  }
  if (value === '1') {
    return createBooleanProperty(true, contextId, depth);
  }
  if (value === '0') {
    return createBooleanProperty(false, contextId, depth);
  }
  if (value.toLowerCase() === 'true') {
    return {
      contextId,
      depth,
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
      contextId,
      depth,
      constant: false,
      type: 'string',
      fullName: '',
      name: '',
      size: 1,
      value: '0',
    };
  }
  return createBooleanProperty(false, contextId, depth);
};
export const createIdentifierProperty = <T extends Property>(name: string, property: T): T => {
  return {
    ...property,
    fullName: name,
    name,
  };
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
export const toBooleanPropertyByProperty = (property: Property | undefined): PrimitiveProperty => {
  if (!property) {
    return createBooleanProperty(false);
  }
  if (property.type === 'undefined') {
    return createBooleanProperty(false, property.contextId, property.depth);
  }
  if (property.type === 'string' && (property.value === '' || property.value === '0')) {
    return createBooleanProperty(false, property.contextId, property.depth);
  }
  if ((property.type === 'integer' || property.type === 'float') && Number(property.value) === 0) {
    return createBooleanProperty(false, property.contextId, property.depth);
  }
  return createBooleanProperty(true, property.contextId, property.depth);
};
export const invertBoolean = (property: Property | undefined): PrimitiveProperty => {
  const bool = toBooleanPropertyByProperty(property);
  bool.value = bool.value === '1' ? '0' : '1';
  return bool;
};

export const calc = (leftValue: EvaluatedValue, rightValue: EvaluatedValue, callback: CalcCallback): PrimitiveProperty => {
  const left = toNumberByProperty(leftValue);
  const right = toNumberByProperty(rightValue);

  if (typeof left === 'number' && typeof right === 'number') {
    const calcedNumber = callback(left, right);
    if (calcedNumber === undefined) {
      return createStringProperty('');
    }
    return createNumberProperty(calcedNumber);
  }

  return createStringProperty('');
};
