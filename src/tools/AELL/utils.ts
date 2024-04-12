import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { PrimitiveProperty, Property } from '../../types/dbgp/session.types';
import { EvaluatedValue } from '../../types/tools/AELL/evaluator.types';
import { CalcCallback, EquivCallback } from '../../types/tools/AELL/utils.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../autohotkey/version';
import { isNumberLike } from '../predicate';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createAELLUtils = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;
  const utils = {
    createStringProperty: (value: string, contextId = -1, depth?: number): PrimitiveProperty => {
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
    },
    createNumberProperty: (value: string | number | bigint, contextId = -1, depth?: number): PrimitiveProperty => {
      if (!isNumberLike(value)) {
        return utils.createNumberProperty(0, contextId, depth);
      }

      const propertyValue = String(value);
      let dataType: dbgp.DataType = 'integer';
      if (propertyValue.includes('.')) {
        dataType = 2 <= version.mejor ? 'float' : 'string';
      }
      return {
        contextId,
        depth,
        constant: false,
        fullName: '',
        name: '',
        size: propertyValue.length,
        value: propertyValue,
        type: dataType,
      };
    },
    createBooleanProperty: (value: string | boolean, contextId = -1, depth?: number): PrimitiveProperty => {
      if (typeof value === 'boolean') {
        return value ? utils.createBooleanProperty('true', contextId, depth) : utils.createBooleanProperty('false', contextId, depth);
      }
      if (value === '1') {
        return utils.createBooleanProperty(true, contextId, depth);
      }
      if (value === '0') {
        return utils.createBooleanProperty(false, contextId, depth);
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
      return utils.createBooleanProperty(false, contextId, depth);
    },
    createIdentifierProperty: <T extends Property>(name: string, property: T): T => {
      return {
        ...property,
        fullName: name,
        name,
      };
    },
    toNumberByProperty: (property: Property | undefined): number | undefined => {
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
    },
    toBooleanPropertyByProperty: (property: Property | undefined): PrimitiveProperty => {
      if (!property) {
        return utils.createBooleanProperty(false);
      }
      if (property.type === 'undefined') {
        return utils.createBooleanProperty(false, property.contextId, property.depth);
      }
      if (property.type === 'string' && (property.value === '' || property.value === '0')) {
        return utils.createBooleanProperty(false, property.contextId, property.depth);
      }
      if ((property.type === 'integer' || property.type === 'float') && Number(property.value) === 0) {
        return utils.createBooleanProperty(false, property.contextId, property.depth);
      }
      return utils.createBooleanProperty(true, property.contextId, property.depth);
    },
    invertBoolean: (property: Property | undefined): PrimitiveProperty => {
      const bool = utils.toBooleanPropertyByProperty(property);
      bool.value = bool.value === '1' ? '0' : '1';
      return bool;
    },
    calc: (leftValue: EvaluatedValue, rightValue: EvaluatedValue, callback: CalcCallback): PrimitiveProperty => {
      const left = utils.toNumberByProperty(leftValue);
      const right = utils.toNumberByProperty(rightValue);

      if ((typeof left === 'number' || typeof left === 'bigint') && (typeof right === 'number' || typeof right === 'bigint')) {
        const result = callback(left, right);
        if (!isNumberLike(result)) {
          return utils.createStringProperty('');
        }

        return utils.createNumberProperty(String(result));
      }

      return utils.createStringProperty('');
    },
    equiv: (leftValue: EvaluatedValue, rightValue: EvaluatedValue, callback: EquivCallback): PrimitiveProperty => {
      if (leftValue === undefined || rightValue === undefined) {
        return utils.createBooleanProperty(false);
      }

      if (leftValue.type === 'object' || rightValue.type === 'object') {
        if (leftValue.type === 'object' && rightValue.type === 'object') {
          return utils.createBooleanProperty(callback(leftValue.address, rightValue.address));
        }
        return utils.createBooleanProperty(false);
      }
      return utils.createBooleanProperty(callback(leftValue.value, rightValue.value));
    },
  };
  return utils;
};
