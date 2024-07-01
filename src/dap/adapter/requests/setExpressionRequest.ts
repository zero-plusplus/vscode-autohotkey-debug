import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setExpressionRequest = async <R extends DebugProtocol.SetExpressionResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetExpressionArguments): Promise<R> => {
  return Promise.resolve(response);
};