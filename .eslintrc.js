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
      },
    },
  ],
};
