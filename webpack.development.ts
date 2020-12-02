import merge from 'webpack-merge';
import commonConfig from './webpack.common';

export default merge(commonConfig, {
  mode: 'development',
  devtool: 'source-map',
  optimization: { minimize: false },
});
