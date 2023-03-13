import * as jest from 'ts-jest';

const config: jest.JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: [ 'build/' ],
};
export default config;
