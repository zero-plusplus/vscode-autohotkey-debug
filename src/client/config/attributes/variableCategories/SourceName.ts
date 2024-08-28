import * as validators from '../../../../tools/validator';
import { SourceName } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';

export const attributeRule: AttributeRule<SourceName> = validators.literalUnion<SourceName>(
  'Local',
  'Global',
  'Static',
);
