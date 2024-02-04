import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const stepInRequest = <R extends DebugProtocol.StepInResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StepInArguments): R => {
  return response;
};
