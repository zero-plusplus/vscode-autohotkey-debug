import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const setExpressionRequest = <R extends DebugProtocol.SetExpressionResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetExpressionArguments): R => {
  return response;
};
