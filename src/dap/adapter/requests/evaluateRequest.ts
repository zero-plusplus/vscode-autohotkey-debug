import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { createConverter, propertyToVariable } from '../../converter/variable';

export const evaluateRequest = async <R extends DebugProtocol.EvaluateResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.EvaluateArguments): Promise<R> => {
  // #region property_get test
  // await runtime.session.setMaxDepth(1);
  // await runtime.session.setMaxChildren(100);
  // const property = await runtime.session.rawSendCommand(args.expression);
  // console.log(property);
  // #endregion property_get test

  const property = await adapter.evaluator.eval(args.expression);
  const variable = await propertyToVariable(property, createConverter(adapter.runtime.session, adapter.variablesReferenceManager));
  adapter.variablesReferenceManager.set(variable);
  response.body = {
    ...variable,
    result: variable.value,
  };
  return response;
};
