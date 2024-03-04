import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const nextRequest = async <R extends DebugProtocol.NextResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.NextArguments): Promise<R> => {
  return Promise.resolve(response);
};
