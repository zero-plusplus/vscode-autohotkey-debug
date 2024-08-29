import * as validators from '../../../../tools/validator';
import { VariableAttributes } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';

export const variableAttributesRule: AttributeRule<VariableAttributes> = validators.object<VariableAttributes>({
  type: validators.string().optional(),
  className: validators.string().optional(),
  isBuiltin: validators.boolean().optional(),
  isStatic: validators.boolean().optional(),
});
