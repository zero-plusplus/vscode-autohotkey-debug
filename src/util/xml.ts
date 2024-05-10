import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  attributeNamePrefix: '',
  attributesGroupName: 'attributes',
  textNodeName: 'content',
  ignoreAttributes: false,
  parseAttributeValue: false,
});
export const parseXml = (source: string): Record<string, any> => {
  return parser.parse(source) as Record<string, any>;
};
