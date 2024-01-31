import { DebugProtocol } from '@vscode/debugprotocol';

export const initializeRequest = <R extends DebugProtocol.InitializeResponse>(response: R, args: DebugProtocol.InitializeRequestArguments): R => {
  response.body = {
    completionTriggerCharacters: [ '.' ],
    supportsCompletionsRequest: true,
    supportsConditionalBreakpoints: true,
    supportsConfigurationDoneRequest: true,
    supportsEvaluateForHovers: true,
    supportsExceptionFilterOptions: true,
    supportsExceptionInfoRequest: true,
    supportsExceptionOptions: true,
    supportsFunctionBreakpoints: true,
    supportsHitConditionalBreakpoints: true,
    supportsLoadedSourcesRequest: true,
    supportsLogPoints: true,
    supportsSetExpression: true,
    supportsSetVariable: true,
    supportTerminateDebuggee: true,
  };
  return response;
};
