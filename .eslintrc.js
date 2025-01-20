const { preset } = require('@zero-plusplus/eslint-my-rules');

module.exports = {
  root: true,
  overrides: [
    {
      ...preset.js.default,
      rules: {
        ...preset.js.default.rules,
      },
    },
    {
      ...preset.ts.default,
      rules: {
        ...preset.ts.default.rules,
        'func-style': 'off',
        'no-undefined': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/restrict-template-expressions': [ 'error', { allowNumber: true } ],
      },
    },
  ],
};
