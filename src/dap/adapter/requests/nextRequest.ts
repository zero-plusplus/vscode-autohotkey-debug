import { DebugProtocol } from '@vscode/debugprotocol';

export const nextRequest = <R extends DebugProtocol.NextResponse>(response: R, args: DebugProtocol.NextArguments): R => {
  return response;
};
