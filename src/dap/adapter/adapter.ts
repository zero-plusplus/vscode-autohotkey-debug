/* eslint-disable @typescript-eslint/lines-between-class-members */
import { LoggingDebugSession } from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
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
import { createScriptRuntimeLauncher } from '../runtime/launcher';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';

export class AutoHotkeyDebugAdapter extends LoggingDebugSession {
  private runtime!: ScriptRuntime;
  // #region initialize requests
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    this.sendResponse(initializeRequest(response, args));
  }
  protected async launchRequest(response: DebugProtocol.LaunchResponse, config: NormalizedDebugConfig): Promise<void> {
    const launcher = createScriptRuntimeLauncher(config);
    this.runtime = await launcher.launch();

    this.sendResponse(launchRequest(this.runtime, response));
  }
  protected async attachRequest(response: DebugProtocol.AttachResponse, config: NormalizedDebugConfig): Promise<void> {
    const launcher = createScriptRuntimeLauncher(config);
    this.runtime = await launcher.attach();

    this.sendResponse(attachRequest(this.runtime, response));
  }
  protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(configurationDoneRequest(this.runtime, response, args));
  }
  // #endregion initialize requests

  // #region termination requests
  protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(disconnectRequest(this.runtime, response, args));
  }
  protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(response);
  }
  // #endregion termination requests

  // #region user-interaction requests
  protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setBreakPointsRequest(this.runtime, response, args));
  }
  protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setFunctionBreakPointsRequest(this.runtime, response, args));
  }
  protected setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setExceptionBreakPointsRequest(this.runtime, response, args));
  }
  protected exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(exceptionInfoRequest(this.runtime, response, args));
  }
  protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setVariableRequest(this.runtime, response, args));
  }
  protected setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(setExpressionRequest(this.runtime, response, args));
  }
  protected completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(completionsRequest(this.runtime, response, args));
  }
  protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(evaluateRequest(this.runtime, response, args));
  }
  // #endregion user-interaction requests

  // #region stop-event lifecycle requests
  protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(threadsRequest(this.runtime, response));
  }
  protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stackTraceRequest(this.runtime, response, args));
  }
  protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(scopesRequest(this.runtime, response, args));
  }
  protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(variablesRequest(this.runtime, response, args));
  }
  // #endregion stop-event lifecycle requests

  // #region execution requests
  protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(continueRequest(this.runtime, response, args));
  }
  protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(nextRequest(this.runtime, response, args));
  }
  protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stepInRequest(this.runtime, response, args));
  }
  protected stepInTargetsRequest(response: DebugProtocol.StepInTargetsResponse, args: DebugProtocol.StepInTargetsArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stepInTargetsRequest(this.runtime, response, args));
  }
  protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(stepOutRequest(this.runtime, response, args));
  }
  protected pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request | undefined): void {
    this.sendResponse(pauseRequest(this.runtime, response, args));
  }
  // #endregion execution requests
}
