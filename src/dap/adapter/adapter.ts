/* eslint-disable @typescript-eslint/lines-between-class-members */
import { LoggingDebugSession } from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { NormalizedDebugConfig } from '../../types/dap/config';
import { initializeRequest } from './requests/initializeRequest';
import { configurationDoneRequest } from './requests/configurationDoneRequest';
import { launchRequest } from './requests/launchRequest';
import { attachRequest } from './requests/attachRequest';
import { disconnectRequest } from './requests/disconnectRequest';
import { setBreakPointsRequest } from './requests/setBreakPointsRequest';
import { setExceptionBreakPointsRequest } from './requests/setExceptionBreakPointsRequest';
import { exceptionInfoRequest } from './requests/exceptionInfoRequest';
import { setFunctionBreakPointsRequest } from './requests/setFunctionBreakPointsRequest';
import { threadsRequest } from './requests/threadsRequest';
import { stackTraceRequest } from './requests/stackTraceRequest';
import { scopesRequest } from './requests/scopesRequest';
import { variablesRequest } from './requests/variablesRequest';
import { continueRequest } from './requests/continueRequest';
import { nextRequest } from './requests/nextRequest';
import { stepInRequest } from './requests/stepInRequest';
import { stepOutRequest } from './requests/stepOutRequest';
import { pauseRequest } from './requests/pauseRequest';
import { stepInTargetsRequest } from './requests/stepInTargetsRequest';
import { setVariableRequest } from './requests/setVariableRequest';
import { setExpressionRequest } from './requests/setExpressionRequest';
import { completionsRequest } from './requests/completionsRequest';
import { evaluateRequest } from './requests/evaluateRequest';
import { DebugContext } from '../../types/dap/adapter';

export class AutoHotkeyDebugAdapter extends LoggingDebugSession {
  private context!: DebugContext;
  // #region initialize requests
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    this.sendResponse(initializeRequest(response, args));
  }
  protected launchRequest(response: DebugProtocol.LaunchResponse, config: NormalizedDebugConfig): void {
    this.context = {} as DebugContext;
    this.context.config = config;

    this.sendResponse(launchRequest(this.context, response));
  }
  protected attachRequest(response: DebugProtocol.AttachResponse, config: NormalizedDebugConfig): void {
    this.context = {} as DebugContext;
    this.context.config = config;

    this.sendResponse(attachRequest(this.context, response));
  }
  protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(configurationDoneRequest(this.context, response, args));
  }
  // #endregion initialize requests

  // #region termination requests
  protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(disconnectRequest(this.context, response, args));
  }
  protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(response);
  }
  // #endregion termination requests

  // #region user-interaction requests
  protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setBreakPointsRequest(this.context, response, args));
  }
  protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setFunctionBreakPointsRequest(this.context, response, args));
  }
  protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setExceptionBreakPointsRequest(this.context, response, args));
  }
  protected exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(exceptionInfoRequest(this.context, response, args));
  }
  protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setVariableRequest(this.context, response, args));
  }
  protected setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setExpressionRequest(this.context, response, args));
  }
  protected completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(completionsRequest(this.context, response, args));
  }
  protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(evaluateRequest(this.context, response, args));
  }
  // #endregion user-interaction requests

  // #region stop-event lifecycle requests
  protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(threadsRequest(this.context, response));
  }
  protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stackTraceRequest(this.context, response, args));
  }
  protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(scopesRequest(this.context, response, args));
  }
  protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(variablesRequest(this.context, response, args));
  }
  // #endregion stop-event lifecycle requests

  // #region execution requests
  protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(continueRequest(this.context, response, args));
  }
  protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(nextRequest(this.context, response, args));
  }
  protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stepInRequest(this.context, response, args));
  }
  protected stepInTargetsRequest(response: DebugProtocol.StepInTargetsResponse, args: DebugProtocol.StepInTargetsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stepInTargetsRequest(this.context, response, args));
  }
  protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stepOutRequest(this.context, response, args));
  }
  protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(pauseRequest(this.context, response, args));
  }
  // #endregion execution requests
}
