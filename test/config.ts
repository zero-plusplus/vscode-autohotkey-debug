import * as path from 'path';

export const rootTestDirectory = __dirname;
export const fixturesDirectory = path.resolve(rootTestDirectory, 'fixtures');
export const fixturesDataDirectory = path.resolve(fixturesDirectory, 'data');

export const createDebugSession = (): Session => {

}