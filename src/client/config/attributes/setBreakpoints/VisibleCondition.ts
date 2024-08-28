import * as validators from '../../../../tools/validator';
import { AttributeRule } from '../../../../types/tools/validator';
import { VisibleCondition } from '../../../../types/dap/variableCategory.types';

export const attributeRule: AttributeRule<VisibleCondition> = validators.alternative<VisibleCondition>(
  validators.string(),
  validators.boolean(),
);
