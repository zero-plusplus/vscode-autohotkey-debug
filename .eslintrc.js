const { javascript, typescript } = require('@zero-plusplus/eslint-my-rules');

module.exports = {
  overrides: [
    {
      files: '*.js',
      env: {
        node: true,
        es6: true,
      },
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
      },
      rules: { ...javascript.rules },
    },
    {
      files: '*.ts',
      env: {
        node: true,
        es6: true,
        mocha: true,
      },
      parser: typescript.parserName,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        tsconfigRootDir: './',
        project: [ './tsconfig.json' ],
      },
      plugins: [ typescript.pluginName ],
      rules: {
        ...typescript.rules,
      },
    },
  ],
};
