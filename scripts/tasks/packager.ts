import { execSync } from 'child_process';

export const packageByVsce = async(): Promise<void> => {
  execSync('npx vsce package');
  return Promise.resolve();
};
