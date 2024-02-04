import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const stepOutRequest = <R extends DebugProtocol.StepOutResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StepOutArguments): R => {
  return response;
};
