const { typescript: { rules } } = require('@zero-plusplus/eslint-my-rules');

module.exports = {
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
    ...rules,
    'no-shadow': [ 'error', { builtinGlobals: true, allow: [ 'resolve', 'reject', 'done', 'context' ] } ],
    'no-undefined': 'off',
    'no-underscore-dangle': 'off',
    '@typescript-eslint/no-floating-promises': 'off', // This rule is redundant if you do not intentionally handle the error.
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': 'off', // Not compatible with TS3.7 Optional chaining
  }
}