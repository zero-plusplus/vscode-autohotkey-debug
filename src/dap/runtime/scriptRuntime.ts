import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { Session } from '../../types/dbgp/session.types';

export const createScriptRuntime = (session: Session, config: NormalizedDebugConfig): ScriptRuntime => {
  const runtime: ScriptRuntime = {
    session,
    config,
    async close(): Promise<Error | undefined> {
      return session.close();
    },
    async detach(): Promise<Error | undefined> {
      return session.detach();
    },
    async echo(args) {
    },
    async setDebugDirectives(args) {
    },

    onStdOut() {
    },
    onStdErr(message) {
    },
    onOutputDebug(message) {
    },
    onWarning(message) {
    },
    onError(error) {
    },
    onProcessClose(exitCode) {
    },
    onServerClose() {
    },
    onSocketClose() {
    },
  };

  session.on('process:close', runtime.onProcessClose);
  session.on('process:error', runtime.onError);
  session.on('process:stdout', runtime.onStdOut);
  session.on('process:stderr', runtime.onStdErr);
  session.on('debugger:close', runtime.onSocketClose);
  session.on('debugger:error', runtime.onError);
  session.on('debugger:stdout', runtime.onStdOut);
  session.on('debugger:stderr', runtime.onOutputDebug);
  session.on('server:close', runtime.onServerClose);
  session.on('server:error', runtime.onError);
  return runtime;
};
