import { AttributeType } from '../../types/dap/config';
import { defaultValue as defaultNameAttributeValue } from './attributes/name';

export class ValidationPriorityError extends Error {
  public readonly attributeName: string;
  constructor(configName: string | undefined, attributeName: string, dependedAttributeError: string) {
    super(`[Configuration: ${configName ?? defaultNameAttributeValue}] Validation Priority Error\nThe ${attributeName} attribute is being verified. The dependent ${dependedAttributeError} attribute has not yet been validated. This error message is intended for extension developers. This message should not be displayed at release time.`);

    this.attributeName = attributeName;
  }
}
export class AttributeWarningError extends Error {
  public readonly attributeName: string;
  constructor(configName: string | undefined, attributeName: string, message: string) {
    super(`[Configuration: ${configName ?? defaultNameAttributeValue}] Warning\n${message}`);

    this.attributeName = attributeName;
  }
}
export class AttributeTypeError extends Error {
  public readonly attributeName: string;
  constructor(configName: string | undefined, attributeName: string, expectedTypeOrTypes: AttributeType | AttributeType[]) {
    const expectedTypes = Array.isArray(expectedTypeOrTypes) ? expectedTypeOrTypes : [ expectedTypeOrTypes ];

    super(`[Configuration: ${configName ?? defaultNameAttributeValue}] Type Error\nThe ${attributeName} attribute must be ${expectedTypes.map((type) => {
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
  constructor(configName: string | undefined, attributeName: string, expectedValueOrValues: string | string[]) {
    const expectedValue = Array.isArray(expectedValueOrValues) ? expectedValueOrValues : [ expectedValueOrValues ];

    super(`[Configuration: ${configName ?? defaultNameAttributeValue}] Value Error\nThe ${attributeName} attribute value must be ${expectedValue.map((value) => `"${value}"`).join(' or ')}.`);

    this.attributeName = attributeName;
  }
}
export class AttributeFileNotFoundError extends Error {
  public readonly attributeName: string;
  constructor(configName: string | undefined, attributeName: string, filePath?: string) {
    super(`[Configuration: ${configName ?? defaultNameAttributeValue}] File Not Found Error\nThe \`${attributeName}\` specified file does not exist. ${filePath ? `Specified "${filePath}"` : ''}`);

    this.attributeName = attributeName;
  }
}
