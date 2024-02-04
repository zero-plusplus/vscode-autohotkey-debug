import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const stepInTargetsRequest = <R extends DebugProtocol.StepInTargetsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StepInTargetsArguments): R => {
  return response;
};
