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
    'arrow-body-style': 'off',
    'class-methods-use-this': 'off',
    'lines-between-class-members': 'off',
    'no-plusplus': 'off',
    'no-shadow': 'off',
    'prefer-named-capture-group': 'off',
    "prefer-destructuring": 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-extra-parens': [ 'error', 'all', { 'enforceForArrowConditionals': false }],
    '@typescript-eslint/no-type-alias': [ 'error', {
      allowAliases: 'always',
      allowCallbacks: 'always',
    } ],
  }
}