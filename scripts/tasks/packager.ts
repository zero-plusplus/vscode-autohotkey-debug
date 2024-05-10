import { execSync } from 'child_process';

export const packageByVsce = async(): Promise<void> => {
  execSync('npx vsce package', { encoding: 'utf-8' });
  return Promise.resolve();
};
