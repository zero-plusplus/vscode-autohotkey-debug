import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { Session } from '../../types/dap/session.types';

export const createScriptRuntime = (session: Session, config: NormalizedDebugConfig): ScriptRuntime => {
  const runtime: ScriptRuntime = {
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

  session.responseEmitter.on('process:close', runtime.onProcessClose);
  session.responseEmitter.on('process:error', runtime.onError);
  session.responseEmitter.on('process:stdout', runtime.onStdOut);
  session.responseEmitter.on('process:stderr', runtime.onStdErr);
  session.responseEmitter.on('debugger:close', runtime.onSocketClose);
  session.responseEmitter.on('debugger:error', runtime.onError);
  session.responseEmitter.on('debugger:stdout', runtime.onStdOut);
  session.responseEmitter.on('debugger:stderr', runtime.onOutputDebug);
  session.responseEmitter.on('server:close', runtime.onServerClose);
  session.responseEmitter.on('server:error', runtime.onError);
  return runtime;
};
