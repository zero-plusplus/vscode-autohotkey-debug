import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const stepInTargetsRequest = async <R extends DebugProtocol.StepInTargetsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StepInTargetsArguments): Promise<R> => {
  return Promise.resolve(response);
};
