import { spawnSync } from 'child_process';
import { fileExists } from '../predicate';

export const evaluateAutoHotkey = (runtime: string, expression: string): string | undefined => {
  if (!fileExists(runtime)) {
    return undefined;
  }

  const ahkCode = `
    stdout := FileOpen("*", "w")
    stdout.write(${expression})
  `;
  const result = spawnSync(runtime, [ '/ErrorStdOut', '/CP65001', '*' ], { input: ahkCode });
  if (result.error) {
    return undefined;
  }

  const evaluatedExpression = result.stdout.toString();
  return evaluatedExpression;
};
