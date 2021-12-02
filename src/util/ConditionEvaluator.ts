import * as createPcre from 'pcre-to-regexp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import regexParser = require('regex-parser');
import { Parser, createParser } from './ConditionParser';
import * as dbgp from '../dbgpSession';
import { LazyMetaVariableValue, MetaVariableValue, MetaVariableValueMap } from './VariableManager';
import { isFloatLike, isIntegerLike, isNumberLike, isPrimitive } from './util';

type Operator = (a, b) => boolean;
const not = (predicate): Operator => (a, b): boolean => !predicate(a, b);
// eslint-disable-next-line eqeqeq
const equals: Operator = (a, b) => a == b;
const equalsIgnoreCase: Operator = (a, b) => {
  const containsObjectAddress = typeof a === 'number' || typeof b === 'number';
  if (containsObjectAddress) {
    return a === b;
  }
  return a.toLowerCase() === b.toLocaleLowerCase();
};
const inequality = (sign: string): Operator => {
  return (a, b): boolean => {
    const containsObjectAddress = typeof a === 'number' || typeof b === 'number';
    if (containsObjectAddress) {
      return false;
    }
    const _a = parseFloat(a);
    const _b = parseFloat(b);
    if (Number.isNaN(_a) || Number.isNaN(_b)) {
      return false;
    }

    if (sign === '<') {
      return _a < _b;
    }
    if (sign === '<=') {
      return _a <= _b;
    }
    if (sign === '>') {
      return _a > _b;
    }
    if (sign === '>=') {
      return _a >= _b;
    }
    return false;
  };
};
const ahkRegexToJsRegex = function(ahkRegex: string): RegExp {
  if (ahkRegex.startsWith('/')) {
    return regexParser(ahkRegex);
  }

  const match = ahkRegex.match(/(?<flags>.+)\)(?<pattern>.+)/ui);
  let flags: string, pattern: string;
  if (match?.groups) {
    flags = match.groups.flags;
    pattern = match.groups.pattern;
  }
  else {
    flags = '';
    pattern = ahkRegex;
  }

  return createPcre(`%${pattern}%${flags}`);
};
const regexCompare: Operator = function(input, ahkRegex) {
  const containsObjectAddress = typeof input === 'number' || typeof ahkRegex === 'number';
  if (containsObjectAddress) {
    return false;
  }

  const regex = ahkRegexToJsRegex(ahkRegex);
  return regex.test(input);
};
const comparisonOperators: { [key: string]: Operator} = {
  '=': equalsIgnoreCase,
  '==': equals,
  '!=': not(equalsIgnoreCase),
  '!==': not(equals),
  '~=': regexCompare,
  '!~': not(regexCompare),
  '<': inequality('<'),
  '<=': inequality('<='),
  '>': inequality('>'),
  '>=': inequality('>='),
};
const logicalOperators: { [key: string]: Operator} = {
  '&&': (a, b) => Boolean(a && b),
  '||': (a, b) => Boolean(a || b),
};

export class ConditionalEvaluator {
  private readonly session: dbgp.Session;
  private readonly parser: Parser;
  constructor(session: dbgp.Session) {
    this.session = session;
    this.parser = createParser(this.session.ahkVersion);
  }
  public async eval(expressions: string, metaVariableMap: MetaVariableValueMap): Promise<boolean> {
    const parsed = this.parser.Expressions.parse(expressions);
    if (!parsed.status) {
      return false;
    }

    const exprs = parsed.value.value;
    if (Array.isArray(exprs)) {
      const [ left, operatorName, right, rest ] = exprs;
      const a = await this.evalExpression(left.value, metaVariableMap);
      const operator = logicalOperators[operatorName];
      const b = await this.evalExpression(right.value, metaVariableMap);
      const result = operator(a, b);
      if (rest) {
        return this.eval(`${String(result)}${String(rest)}`, metaVariableMap);
      }
      return result;
    }

    return this.evalExpression(exprs.value, metaVariableMap);
  }
  public async evalExpression(expression: { type: string; value: any}, metaVariableMap: MetaVariableValueMap): Promise<boolean> {
    let primitiveValue;
    if (expression.type === 'BinaryExpression') {
      const [ a, operatorType, b ] = expression.value;

      if (operatorType.type === 'ComparisonOperator') {
        const operator = comparisonOperators[operatorType.value];
        const getValue = async(parsed): Promise<string | number | null> => {
          const value = await this.evalValue(parsed, metaVariableMap);

          if (this.session.ahkVersion.mejor <= 1.1 && !value) {
            return '';
          }

          if (isPrimitive(value)) {
            return value;
          }
          else if (value instanceof dbgp.ObjectProperty) {
            return value.address;
          }
          else if (value instanceof dbgp.PrimitiveProperty) {
            return value.value;
          }

          return null;
        };
        const _a = await getValue(a);
        const _b = await getValue(b);

        if (_a !== null && _b !== null) {
          return operator(_a, _b);
        }
      }
      else if ([ 'IsOperator', 'InOperator', 'HasOperator', 'ContainsOperator' ].includes(operatorType.type)) {
        const negativeMode = -1 < operatorType.value.search(/not/ui);
        const valueA = await this.evalValue(a, metaVariableMap);
        const valueB = await this.evalValue(b, metaVariableMap);

        let result = false;
        if (operatorType.type === 'IsOperator') {
          if (valueA instanceof dbgp.ObjectProperty && valueB instanceof dbgp.ObjectProperty) {
            let baseName = `${valueA.fullName}.<base>`;
            let baseClassNameProperty = await this.session.evaluate(`${baseName}.__class`);
            while (baseClassNameProperty) {
              // eslint-disable-next-line no-await-in-loop
              baseClassNameProperty = await this.session.evaluate(`${baseName}.__class`);
              if (baseClassNameProperty instanceof dbgp.PrimitiveProperty) {
                if (valueB.fullName === baseClassNameProperty.value) {
                  result = true;
                  break;
                }
              }

              baseName += '.<base>';
            }
          }
          else if ((valueA instanceof dbgp.Property || isPrimitive(valueA)) && (valueB instanceof dbgp.PrimitiveProperty || typeof valueB === 'string')) {
            const valueAType = valueA instanceof dbgp.Property ? valueA.type : String(a.value?.value?.type ?? a.value.type).toLowerCase();
            const valueBType = String(valueB instanceof dbgp.PrimitiveProperty ? valueB.value : valueB)
              .toLowerCase()
              .replace(/(?<=\b)int(?=\b)/ui, 'integer');

            if (valueAType === valueBType) {
              result = true;
            }
            else if (valueBType === 'primitive') {
              if ([ 'string', 'integer', 'float' ].includes(valueAType)) {
                result = true;
              }
            }
            else if (valueBType === 'number') {
              if ([ 'integer', 'float' ].includes(valueAType)) {
                result = true;
              }
            }
            else if (valueA instanceof dbgp.ObjectProperty && valueBType.startsWith('object:')) {
              const className = valueBType.match(/^object:(.*)$/ui)![1];
              if (className.toLowerCase() === valueA.className.toLowerCase()) {
                result = true;
              }
            }
            else if (valueA instanceof dbgp.PrimitiveProperty || isPrimitive(valueA)) {
              const _valueA = String(valueA instanceof dbgp.PrimitiveProperty ? valueA.value : valueA);
              if (valueBType === 'integer:like' && isIntegerLike(_valueA)) {
                result = true;
              }
              else if (valueBType === 'float:like' && isFloatLike(_valueA)) {
                result = true;
              }
              else if (valueBType === 'number:like' && isNumberLike(_valueA)) {
                result = true;
              }
              else if (valueBType === 'string:alpha' && -1 < _valueA.search(/^[a-zA-Z]+$/u)) {
                result = true;
              }
              else if (valueBType === 'string:alnum' && -1 < _valueA.search(/^[a-zA-Z0-9]+$/u)) {
                result = true;
              }
              else if (valueBType === 'string:upper' && -1 < _valueA.search(/^[A-Z]+$/u)) {
                result = true;
              }
              else if (valueBType === 'string:lower' && -1 < _valueA.search(/^[a-z]+$/u)) {
                result = true;
              }
              else if (valueBType === 'string:space' && -1 < _valueA.search(/^\s+$/u)) {
                result = true;
              }
              else if (valueBType === 'string:hex' && -1 < _valueA.search(/^0x[0-9a-fA-F]+$/u)) {
                result = true;
              }
              else if (valueBType === 'string:time' && !Number.isNaN(Date.parse(_valueA))) {
                result = true;
              }
            }
          }
          else if (!valueA && valueB === 'undefined') {
            result = true;
          }
        }
        else if (operatorType.type === 'InOperator' && valueB instanceof dbgp.ObjectProperty) {
          if (valueA instanceof dbgp.PrimitiveProperty || typeof valueA === 'string') {
            const keyName = valueA instanceof dbgp.PrimitiveProperty ? valueA.value : valueA;
            const property = await this.session.evaluate(`${valueB.fullName}.${keyName}`);
            if (property) {
              result = true;
            }
          }
        }
        else if (operatorType.type === 'HasOperator' && (valueA instanceof dbgp.ObjectProperty || valueA instanceof Object)) {
          const keys = valueA instanceof dbgp.ObjectProperty ? valueA.children.map((child) => child.name) : Object.keys(valueA);
          if (valueB instanceof dbgp.ObjectProperty) {
            result = keys.some((key) => {
              const match = key.match(/^\[Object\((?<address>\d+)\)\]$/u);
              return match?.groups?.address === String(valueB.address);
            });
          }
          else {
            const searchValue = valueB instanceof dbgp.PrimitiveProperty ? valueB.value : valueB;
            const isRegExp = String(searchValue).startsWith('/');
            result = keys.some((key) => {
              if (key === '<enum>') {
                return false;
              }
              const fixedName = key.replace(/^\["|^<|"\]$|>$/gu, '');
              return isRegExp ? regexCompare(fixedName, searchValue) : equals(fixedName, searchValue);
            });
          }
        }
        else if (operatorType.type === 'ContainsOperator') {
          const children = valueA instanceof dbgp.ObjectProperty ? valueA.children.map((child) => (child instanceof dbgp.PrimitiveProperty ? { type: 'primitive', value: child.value } : { type: 'object', value: (child as dbgp.ObjectProperty).address })) : Object.entries(valueA ?? {}).map(([ key, value ]) => (isPrimitive(value) ? { type: 'primitive', value } : { type: 'object' }));
          if (valueB instanceof dbgp.Property || isPrimitive(valueB)) {
            if (valueB instanceof dbgp.ObjectProperty) {
              result = children.some((child) => {
                if (child.type === 'object') {
                  return child.value === valueB.address;
                }
                return false;
              });
            }
            else {
              const searchValue = valueB instanceof dbgp.PrimitiveProperty ? valueB.value : valueB;
              const isRegExp = String(searchValue).startsWith('/');
              result = children.some((child) => {
                if (child.type === 'object') {
                  return false;
                }
                return isRegExp ? regexCompare(child.value, searchValue) : equals(child.value, searchValue);
              });
            }
          }
        }

        if (negativeMode) {
          return !result;
        }
        return result;
      }
    }
    else if (expression.type === 'MetaVariable') {
      if (metaVariableMap.has(expression.value.value)) {
        primitiveValue = metaVariableMap.get(expression.value.value)!;
      }
    }
    else if (expression.type === 'PropertyName') {
      const property = await this.evalProperty(expression);
      if (property instanceof dbgp.PrimitiveProperty) {
        primitiveValue = property.value;
      }
      else if (property instanceof dbgp.ObjectProperty) {
        primitiveValue = String(property.address);
      }
      else if (typeof property === 'string') {
        primitiveValue = property;
      }
    }
    else if (expression.type === 'Primitive') {
      const primitive = expression.value;
      if (primitive.type === 'String') {
        const string = expression.value;
        primitiveValue = string.value;
      }
      else if (primitive.type === 'Number') {
        const number = expression.value;
        primitiveValue = number.value.value;
      }
      else {
        const boolean = primitive;
        primitiveValue = boolean.value;
      }
    }

    if (typeof primitiveValue === 'string') {
      if (isNumberLike(primitiveValue)) {
        const number = Number(primitiveValue);
        return Boolean(number);
      }
      return primitiveValue !== '';
    }
    return false;
  }
  private async evalProperty(parsed): Promise<string | dbgp.Property | undefined> {
    if (!('type' in parsed || 'value' in parsed)) {
      return undefined;
    }

    const propertyName = parsed.value;
    if (parsed?.extraInfo === 'countof') {
      const property = await this.session.evaluate(propertyName);
      if (property instanceof dbgp.ObjectProperty) {
        const maxIndex = property.maxIndex;
        if (maxIndex) {
          return String(maxIndex);
        }
        const children = property.children.filter((element) => element.name !== '<base>');
        return String(children.length);
      }
      else if (property instanceof dbgp.PrimitiveProperty) {
        return String(property.value.length);
      }
      return undefined;
    }
    return this.session.evaluate(propertyName);
  }
  private async evalValue(parsed, metaVariableMap: MetaVariableValueMap): Promise<string | number | dbgp.Property | MetaVariableValue | LazyMetaVariableValue | undefined> {
    if (!('type' in parsed || 'value' in parsed)) {
      return undefined;
    }

    if (parsed.type === 'MetaVariable') {
      const metaVariable = metaVariableMap.get(parsed.value.value);
      return metaVariable;
    }
    else if (parsed.type === 'PropertyName') {
      return this.evalProperty(parsed);
    }
    else if (parsed.type === 'Primitive') {
      const primitive = parsed.value;
      if (primitive.type === 'String') {
        if (parsed?.extraInfo === 'countof') {
          const value = String(primitive.value);
          return String(value.length);
        }
        return String(primitive.value);
      }
      if (primitive.type === 'Boolean') {
        return String(primitive.value);
      }

      const number = primitive.value;
      if (parsed?.extraInfo === 'countof') {
        const value = String(number.value);
        return String(value.length);
      }
      if (typeof number.value === 'number') {
        return number.value as number;
      }
      return String(number.value);
    }
    else if (parsed.type === 'RegExp') {
      return String(parsed.value);
    }

    return undefined;
  }
}
