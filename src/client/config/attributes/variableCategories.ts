import { AttributeValidator } from '../../../types/dap/config';
import { VariableCategory } from '../../../types/dap/variableCategory';

export const attributeName = 'variableCategories';
export const defaultValue = undefined;
export const recommendValue: VariableCategory[] = [
  {
    label: 'Local',
    items: [ { source: 'Local', select: { attributes: { isStatic: false } } } ],
  },
  {
    label: 'Static',
    items: [ { source: 'Static' } ],
  },
  {
    label: 'Static',
    items: [ { source: 'Local', select: { attributes: { isStatic: true } } } ],
  },
  {
    label: 'Global',
    items: [ { source: 'Global' } ],
    filters: [
      { pattern: '/\\d/' },
      { attributes: { isBuiltin: false } },
    ],
  },
  {
    label: 'Builtin-Global',
    items: [ { source: 'Global' } ],
    filters: [
      { pattern: '/\\d/' },
      { attributes: { isBuiltin: true } },
    ],
  },
];
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawVariableCategories = checker.get();
  if (rawVariableCategories === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (typeof rawVariableCategories === 'string') {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (rawVariableCategories === 'recommend') {
      checker.markValidated(recommendValue);
      return Promise.resolve();
    }

    checker.throwValueError('recommend');
    return Promise.resolve();
  }

  if (!Array.isArray(rawVariableCategories)) {
    checker.throwTypeError('category object[]');
    return Promise.resolve();
  }

  checker.markValidated(rawVariableCategories);
  return Promise.resolve();
};
