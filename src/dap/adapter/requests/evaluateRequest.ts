import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const evaluateRequest = <R extends DebugProtocol.EvaluateResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.EvaluateArguments): R => {
  return response;
};
