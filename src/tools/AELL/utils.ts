import { PrimitivePropertyLike, PropertyLike } from '../../types/dap/runtime/context.types';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { CalcCallback, EquivCallback, NumberType } from '../../types/tools/AELL/utils.types';
import { CustomNode } from '../../types/tools/autohotkey/parser/common.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../autohotkey/version';
import { isNumberLike } from '../predicate';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export const createAELLUtils = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;
  // const isV1 = version.mejor < 2;
  const isV2 = 2 <= version.mejor;

  const utils = {
    createPseudoPrimitiveProperty: (value: string, type: dbgp.PrimitiveDataType): PrimitivePropertyLike => {
      return {
        contextId: -1,
        stackLevel: 0,
        constant: undefined,
        fullName: '',
        name: '',
        size: value.length,
        type,
        value,
      };
    },
    createPrimitiveProperty: (value: string, type: dbgp.PrimitiveDataType, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel = 0): PrimitivePropertyLike => {
      const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

      return {
        contextId,
        stackLevel,
        constant: false,
        fullName: '',
        name: '',
        size: value.length,
        type,
        value,
      };
    },
    createStringProperty: (value: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName | -1 = -1, stackLevel = 0): PrimitivePropertyLike => {
      const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;
      if (contextId === -1) {
        return utils.createPseudoPrimitiveProperty(value, 'string');
      }
      return utils.createPrimitiveProperty(value, 'string', contextId, stackLevel);
    },
    createNumberProperty: (value: string | number | bigint, contextIdOrName: dbgp.ContextId | dbgp.ContextName | -1 = -1, stackLevel = 0): PrimitivePropertyLike => {
      const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

      if (!isNumberLike(value)) {
        if (contextId === -1) {
          return utils.createPseudoPrimitiveProperty('0', 'integer');
        }
        return utils.createNumberProperty(0, contextId, stackLevel);
      }

      const propertyValue = String(value);
      let dataType: dbgp.DataType = 'integer';
      if (propertyValue.includes('.')) {
        dataType = isV2 ? 'float' : 'string';
      }

      if (contextId === -1) {
        return utils.createPseudoPrimitiveProperty(propertyValue, dataType);
      }
      return utils.createPrimitiveProperty(propertyValue, dataType, contextId, stackLevel);
    },
    createBooleanProperty: (value: string | boolean, contextIdOrName: dbgp.ContextId | dbgp.ContextName | -1 = -1, stackLevel = 0): PrimitivePropertyLike => {
      const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

      if (typeof value === 'boolean') {
        return value ? utils.createBooleanProperty('true', contextId, stackLevel) : utils.createBooleanProperty('false', contextId, stackLevel);
      }
      if (value === '1') {
        return utils.createBooleanProperty(true, contextId, stackLevel);
      }
      if (value === '0') {
        return utils.createBooleanProperty(false, contextId, stackLevel);
      }
      if (value.toLowerCase() === 'true') {
        if (contextId === -1) {
          return utils.createPseudoPrimitiveProperty('1', 'string');
        }
        return utils.createPrimitiveProperty('1', 'string', contextId, stackLevel);
      }
      if (value.toLowerCase() === 'false') {
        if (contextId === -1) {
          return utils.createPseudoPrimitiveProperty('0', 'string');
        }
        return utils.createPrimitiveProperty('0', 'string', contextId, stackLevel);
      }
      return utils.createBooleanProperty(false, contextId, stackLevel);
    },
    createUnsetProperty: (name: string, objectName = '', contextIdOrName: dbgp.ContextId | dbgp.ContextName | -1 = -1, stackLevel = 0): PrimitivePropertyLike => {
      const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;
      if (contextId === -1) {
        return {
          contextId,
          name,
          fullName: `${objectName}.${name}`,
          constant: undefined,
          stackLevel: 0,
          size: 0,
          type: 'undefined',
          value: '',
        };
      }
      return {
        contextId,
        name,
        fullName: `${objectName}.${name}`,
        constant: false,
        size: 0,
        type: 'undefined',
        value: '',
        stackLevel,
      };
    },
    /**
     * @template T
     * @param {string} name
     * @param {T | undefined} property
     * @returns
     */
    /**
     * @template T
     * @param {string} name
     * @param {string} objectName
     * @param {T | undefined} property
     * @returns
     */
    createIdentifierProperty: <T extends PropertyLike>(...params: any[]): T => {
      const name = String(params[0]);
      const objectName = String(params.length === 2 ? '' : params[1]);
      const property = (params.length === 3 ? params[2] : params[1]) as T | undefined;
      if (!property) {
        return utils.createUnsetProperty(name, objectName) as T;
      }
      return {
        ...property,
        name,
        fullName: objectName === '' ? name : `${objectName}.${name}`,
      };
    },
    toNumberType: (property: PropertyLike | undefined): NumberType | undefined => {
      switch (property?.type) {
        case 'string': {
          if (isNumberLike(property.value)) {
            return property.value.includes('.') ? 'float' : 'integer';
          }
          break;
        }
        case 'integer': return 'integer';
        case 'float': return 'float';
        default: break;
      }

      return undefined;
    },
    toNumberByProperty: (property: PropertyLike | undefined): number | undefined => {
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
    toBooleanPropertyByProperty: (property: PropertyLike | undefined): PrimitivePropertyLike => {
      if (!property) {
        return utils.createBooleanProperty(false);
      }
      if (property.type === 'undefined') {
        return utils.createBooleanProperty(false, property.contextId, property.stackLevel);
      }
      if (property.type === 'string' && (property.value === '' || property.value === '0')) {
        return utils.createBooleanProperty(false, property.contextId, property.stackLevel);
      }
      if ((property.type === 'integer' || property.type === 'float') && Number(property.value) === 0) {
        return utils.createBooleanProperty(false, property.contextId, property.stackLevel);
      }
      return utils.createBooleanProperty(true, property.contextId, property.stackLevel);
    },
    invertBoolean: (property: PropertyLike | undefined): PrimitivePropertyLike => {
      const bool = utils.toBooleanPropertyByProperty(property);
      bool.value = bool.value === '1' ? '0' : '1';
      return bool;
    },
    calc: (leftValue: PropertyLike, rightValue: PropertyLike, callback: CalcCallback): PrimitivePropertyLike => {
      const left = utils.toNumberByProperty(leftValue);
      const right = utils.toNumberByProperty(rightValue);

      const left_type = utils.toNumberType(leftValue);
      const right_type = utils.toNumberType(rightValue);
      if (left_type && right_type) {
        if ((typeof left === 'number' || typeof left === 'bigint') && (typeof right === 'number' || typeof right === 'bigint')) {
          const result = callback(left, right, [ left_type, right_type ]);
          if (!isNumberLike(result)) {
            return utils.createStringProperty('');
          }

          return utils.createNumberProperty(String(result));
        }
      }

      return utils.createStringProperty('');
    },
    equiv: (leftValue: PropertyLike, rightValue: PropertyLike, callback: EquivCallback): PrimitivePropertyLike => {
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

export const isQueryNode = (value: any): value is (CustomNode & { query: string; name?: string }) => {
  if (typeof value !== 'object') {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (('query' in value && typeof value.query === 'string')) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ('name' in value && typeof value.name !== 'string') {
      return false;
    }
    return true;
  }

  return false;
};
