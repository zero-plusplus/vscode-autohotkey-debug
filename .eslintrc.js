const { typescript } = require('@zero-plusplus/eslint-my-rules');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    tsconfigRootDir: './',
    project: [ './tsconfig.json' ],
  },
  env: {
      node: true,
      es6: true,
      mocha: true,
  },
  plugins: [ "@typescript-eslint" ],
  rules: {
    ...typescript.rules,
  }
}