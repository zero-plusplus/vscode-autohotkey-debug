import * as validators from '../../../../tools/validator';
import { SourceSelector } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';

export const sourceSelectorRule: AttributeRule<SourceSelector> = validators.literalUnion(
  '*',
  'Local',
  'Global',
  'Static',
);
