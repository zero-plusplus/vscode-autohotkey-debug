import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/runtime';

export const nextRequest = <R extends DebugProtocol.NextResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.NextArguments): R => {
  return response;
};
