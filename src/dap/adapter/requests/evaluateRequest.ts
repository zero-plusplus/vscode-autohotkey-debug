import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const evaluateRequest = async <R extends DebugProtocol.EvaluateResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.EvaluateArguments): Promise<R> => {
  return Promise.resolve(response);
};
