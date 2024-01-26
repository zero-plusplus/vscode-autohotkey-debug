import * as parser from 'fast-xml-parser';
import * as he from 'he';

export const parseXml = (source: string): Record<string, any> => {
  return parser.parse(source, {
    attributeNamePrefix: '',
    attrNodeName: 'attributes',
    textNodeName: 'content',
    ignoreAttributes: false,
    parseNodeValue: false,
    attrValueProcessor: (value: string, attrName: string) => String(he.decode(value, { isAttributeValue: true })),
    tagValueProcessor: (value: string, tagName: string) => String(he.decode(value)),
  }) as Record<string, any>;
};
