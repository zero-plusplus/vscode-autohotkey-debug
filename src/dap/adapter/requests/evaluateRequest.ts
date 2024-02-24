import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const evaluateRequest = <R extends DebugProtocol.EvaluateResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.EvaluateArguments): R => {
  return response;
};
