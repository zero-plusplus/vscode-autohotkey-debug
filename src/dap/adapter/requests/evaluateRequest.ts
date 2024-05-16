import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const evaluateRequest = async <R extends DebugProtocol.EvaluateResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.EvaluateArguments): Promise<R> => {
  // #region property_get test
  // await runtime.session.setMaxDepth(1);
  // await runtime.session.setMaxChildren(100);
  // const property = await runtime.session.rawSendCommand(args.expression);
  // console.log(property);
  // #endregion property_get test

  return Promise.resolve(response);
};
