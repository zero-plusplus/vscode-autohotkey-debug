import { GreenElement } from '../../../../types/tools/autohotkey/parser/common.types';

export const printGreenNode = (greenElement: GreenElement): string => {
  const children = 'children' in greenElement ? greenElement.children : [ greenElement ];
  return children.reduce((text, child) => {
    if ('children' in child) {
      return printGreenNode(child);
    }
    return text + child.text;
  }, '');
};
