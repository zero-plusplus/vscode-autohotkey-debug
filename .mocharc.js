/** @type {import("mocha").MochaOptions} */
module.exports = {
  package: './package.json',
  require: [
    'source-map-support/register',
    'esbuild-register',
  ],
  // parallel: true,
  bail: true,
  ui: 'tdd',
  timeout: 999999,
  colors: true,
};