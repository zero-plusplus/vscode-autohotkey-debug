/* eslint-disable @typescript-eslint/lines-between-class-members */
import { InitializedEvent, LoggingDebugSession, StoppedEvent, TerminatedEvent } from '@vscode/debugadapter';
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
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { RequestQueue } from '../utils/RequestQueue';
import { ExecResult } from '../../types/dbgp/session.types';
import { StopReason } from '../../types/dap/adapter/adapter.types';

export class AutoHotkeyDebugAdapter extends LoggingDebugSession {
  public runtime!: Readonly<ScriptRuntime>;
  public config!: Readonly<NormalizedDebugConfig>;
  private readonly requestQueue = new RequestQueue();
  // #region public methods
  public sendStoppedEvent(reason: StopReason | ExecResult): void {
    this.sendEvent(new StoppedEvent(toStopReason(reason), this.runtime.threadId));

    function toStopReason(execResult: StopReason | ExecResult): StopReason {
      if (typeof execResult === 'string') {
        return execResult;
      }

      switch (execResult.reason) {
        case 'aborted':
        case 'error': return 'error';
        case 'exception': return 'exception';
        default: break;
      }
      return 'breakpoint';
    }
  }
  public sendTerminatedEvent(): void {
    this.sendEvent(new TerminatedEvent());
  }
  // #endregion public methods

  // #region initialize requests
  protected async initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): Promise<void> {
    await this.request('initializeRequest', async() => {
      this.sendResponse(await initializeRequest(response, args));
    });
  }
  protected async launchRequest(response: DebugProtocol.LaunchResponse, config: NormalizedDebugConfig): Promise<void> {
    await this.request('launchRequest', async() => {
      this.config = config;
      const [ runtime, newResponse ] = await launchRequest(this.config, response);
      runtime.config = this.config;
      this.runtime = runtime;

      this.sendResponse(newResponse);
      this.sendEvent(new InitializedEvent());
    });
  }
  protected async attachRequest(response: DebugProtocol.AttachResponse, config: NormalizedDebugConfig): Promise<void> {
    this.config = config;
    await this.request('attachRequest', async() => {
      const [ runtime, newResponse ] = await attachRequest(this.config, response);
      runtime.config = this.config;
      this.runtime = runtime;

      this.sendResponse(newResponse);
      this.sendEvent(new InitializedEvent());
    });
  }
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('configurationDoneRequest', async() => {
      this.sendResponse(await configurationDoneRequest(this, response, args));
    });
  }
  // #endregion initialize requests

  // #region termination requests
  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('disconnectRequest', async() => {
      this.sendResponse(await disconnectRequest(this, response, args));
    });
  }
  protected async restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('restartRequest', async() => {
      this.sendResponse(response);
      return Promise.resolve();
    });
  }
  // #endregion termination requests

  // #region user-interaction requests
  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('setBreakPointsRequest', async() => {
      this.sendResponse(await setBreakPointsRequest(this, response, args));
    });
  }
  protected async setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('setFunctionBreakPointsRequest', async() => {
      this.sendResponse(await setFunctionBreakPointsRequest(this.runtime, response, args));
    });
  }
  protected async setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('setExceptionBreakPointsRequest', async() => {
      this.sendResponse(await setExceptionBreakPointsRequest(this.runtime, response, args));
    });
  }
  protected async exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('exceptionInfoRequest', async() => {
      this.sendResponse(await exceptionInfoRequest(this, response, args));
    });
  }
  protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('setVariableRequest', async() => {
      this.sendResponse(await setVariableRequest(this.runtime, response, args));
    });
  }
  protected async setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('setExpressionRequest', async() => {
      this.sendResponse(await setExpressionRequest(this.runtime, response, args));
    });
  }
  protected async completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('completionsRequest', async() => {
      this.sendResponse(await completionsRequest(this.runtime, response, args));
    });
  }
  protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('evaluateRequest', async() => {
      this.sendResponse(await evaluateRequest(this.runtime, response, args));
    });
  }
  // #endregion user-interaction requests

  // #region stop-event lifecycle requests
  protected async threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('threadsRequest', async() => {
      this.resetLifetimeOfObjectsReferences();

      this.sendResponse(await threadsRequest(this, response));
    });
  }
  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('stackTraceRequest', async() => {
      this.sendResponse(await stackTraceRequest(this, response, args));
    });
  }
  protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('scopesRequest', async() => {
      this.sendResponse(await scopesRequest(this, response, args));
    });
  }
  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('variablesRequest', async() => {
      this.sendResponse(await variablesRequest(this, response, args));
    });
  }
  // #endregion stop-event lifecycle requests

  // #region execution requests
  protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('continueRequest', async() => {
      this.sendResponse(await continueRequest(this.runtime, response, args));
    });
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('nextRequest', async() => {
      this.sendResponse(await nextRequest(this.runtime, response, args));
    });
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('stepInRequest', async() => {
      this.sendResponse(await stepInRequest(this.runtime, response, args));
    });
  }
  protected async stepInTargetsRequest(response: DebugProtocol.StepInTargetsResponse, args: DebugProtocol.StepInTargetsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('stepInTargetsRequest', async() => {
      this.sendResponse(await stepInTargetsRequest(this.runtime, response, args));
    });
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('stepOutRequest', async() => {
      this.sendResponse(await stepOutRequest(this.runtime, response, args));
    });
  }
  protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request('pauseRequest', async() => {
      this.sendResponse(await pauseRequest(this.runtime, response, args));
    });
  }
  private async request<T>(requestName: string, handler: () => Promise<T>): Promise<void> {
    console.log(requestName);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.runtime?.isClosed) {
      this.sendTerminatedEvent();
      return;
    }

    this.requestQueue.enqueue(handler);
    await this.requestQueue.flush();
  }
  // #endregion execution requests

  // #region private methods
  private async resetLifetimeOfObjectsReferences(): Promise<void> {
    // https://microsoft.github.io/debug-adapter-protocol/overview#lifetime-of-objects-references
    this.runtime.resetVariableReference();
    return Promise.resolve();
  }
  // #endregion private methods
}
