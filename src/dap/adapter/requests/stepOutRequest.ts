import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const stepOutRequest = async <R extends DebugProtocol.StepOutResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StepOutArguments): Promise<R> => {
  return Promise.resolve(response);
};
