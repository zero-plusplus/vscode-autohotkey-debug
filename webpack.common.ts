import * as path from 'path';
import * as webpack from 'webpack';
import { TSConfigJSON } from 'types-tsconfig';
import { ESBuildPlugin } from 'esbuild-loader';
import { readFileSync } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const tsconfig = JSON.parse(readFileSync('./tsconfig.json').toString()) as TSConfigJSON;
tsconfig.include = [ 'src/**/*.ts' ];

export default {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'build/dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  externals: {
    'ts-predicates': 'commonjs ts-predicates',
    'typeof-util': 'commonjs typeof-util',
    'underscore': 'commonjs underscore',
    'vscode': 'commonjs vscode',
    'vscode-uri': 'commonjs vscode-uri',
  },
  resolve: { extensions: [ '.ts', '.js' ] },
  module: {
    rules: [
      {
        test: /\.ts$/u,
        loader: 'esbuild-loader',
        options: {
          loader: 'ts',
          target: 'esnext',
          tsconfigRaw: JSON.stringify(tsconfig),
        },
      },
    ],
  },
  cache: {
    type: 'filesystem',
    buildDependencies: { config: [ __filename ] },
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configOverwrite: { ...tsconfig },
        // profile: true,
      },
      eslint: { files: tsconfig.include },
    }),
    new ESBuildPlugin(),
  ],
} as webpack.Configuration;
