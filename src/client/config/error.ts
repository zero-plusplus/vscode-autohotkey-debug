import { AttributeType } from '../../types/dap/config';

export class AttributeWarningError extends Error {
  public readonly attributeName: string;
  constructor(attributeName: string, message: string) {
    super(`[warning] ${message}`);

    this.attributeName = attributeName;
  }
}
export class AttributeTypeError extends Error {
  public readonly attributeName: string;
  constructor(attributeName: string, expectedTypeOrTypes: AttributeType | AttributeType[]) {
    const expectedTypes = Array.isArray(expectedTypeOrTypes) ? expectedTypeOrTypes : [ expectedTypeOrTypes ];

    super(`The ${attributeName} attribute must be ${expectedTypes.map((type) => {
      if (type.endsWith('[]')) {
        return `an array of ${type.slice(0, -2)}`;
      }
      const article = (/^(a|i||u|e|o)$/u).test(type) ? 'an' : 'a';
      return `${article} ${type}`;
    }).join(' or ')}.`);

    this.attributeName = attributeName;
  }
}
export class AttributeValueError extends Error {
  public readonly attributeName: string;
  constructor(attributeName: string, expectedValueOrValues: string | string[]) {
    const expectedValue = Array.isArray(expectedValueOrValues) ? expectedValueOrValues : [ expectedValueOrValues ];

    super(`The ${attributeName} attribute value must be ${expectedValue.map((value) => `"${value}"`).join(' or ')}.`);

    this.attributeName = attributeName;
  }
}
