const globals = require('globals');
const { javascript, typescript } = require('@zero-plusplus/eslint-my-rules');

const ignores = [
  'build/',
  'node_modules/',
];

module.exports = [
  typescript.createLanguageOptions({
    globals: globals.node,
    parserOptions: {
      project: true,
      tsconfigDirName: __dirname,
    },
  }),
  {
    ...javascript.config,
    ignores,
  },
  {
    ...typescript.config,
    ignores,
  },
];
