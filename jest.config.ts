import * as jest from 'ts-jest';

const config: jest.JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [ '<rootDir>/test/v1-0-0' ],
  modulePathIgnorePatterns: [ 'build/' ],
};
export default config;
