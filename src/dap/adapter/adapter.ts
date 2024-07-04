import { InitializedEvent, LoggingDebugSession, OutputEvent, StoppedEvent, TerminatedEvent } from '@vscode/debugadapter';
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
import { ScriptRuntime } from '../../types/tools/autohotkey/runtime/scriptRuntime.types';
import { ExecResult } from '../../types/dbgp/session.types';
import { MessageCategory, StopReason } from '../../types/dap/adapter/adapter.types';
import { AELLEvaluator } from '../../types/tools/AELL/evaluator.types';
import { createEvaluator } from '../../tools/AELL/evaluator';
import { createMutex } from '../../tools/promise';
import { createEventManager } from '../../dbgp/event';
import { CriticalError } from './error';
import { createFrameIdManager, createVariablesReferenceManager } from './utils';

export class AutoHotkeyDebugAdapter extends LoggingDebugSession {
  public variablesReferenceManager = createVariablesReferenceManager();
  public framdIdManager = createFrameIdManager();
  public runtime!: Readonly<ScriptRuntime>;
  public config!: Readonly<NormalizedDebugConfig>;
  public evaluator!: AELLEvaluator;
  public isTerminateRequested = false;
  public eventManager = createEventManager();
  public mutex = createMutex();
  // #region public methods
  public sendStoppedEvent(reason: StopReason | ExecResult): void {
    const stopReason = toStopReason(reason);
    if (stopReason === 'exit') {
      this.sendTerminatedEvent();
      return;
    }
    this.sendEvent(new StoppedEvent(stopReason, this.runtime.threadId));

    function toStopReason(execResult: StopReason | ExecResult): StopReason {
      if (typeof execResult === 'string') {
        return execResult;
      }

      if (execResult.runState === 'stopped') {
        return 'exit';
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
  public sendTerminatedEvent(errOrCode?: number | Error): void {
    this.sendEvent(new TerminatedEvent());
  }
  public sendOutputMessage(message?: string, category?: MessageCategory): void {
    if (!category) {
      return;
    }
    if (message === undefined || message === '') {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.config === undefined) {
      return;
    }

    const convertedMessage = fixPathLink(message, this.config.program);
    this.sendEvent(new OutputEvent(convertedMessage, category));

    function fixPathLink(message: string, program: string): string {
      // Convert to `path/to:line` format so that vscode can treat paths as links.
      // If an error occurs in the following source code, the message is fixed as follows.
      // ```ahk
      // 001| a :
      // 002: return
      // ```
      // Before: "path/to.ahk (1) : ==> This line does not contain a recognized action.\n     Specifically: a :\n"
      // After:  "path/to.ahk:1 ==> This line does not contain a recognized action.\n     Specifically: a :\n"
      return message.replace(/^([^\r\n]+)(?=\s\(\d)\s\((\d+)\)\s:/mu, `$1:$2 :`);
    }
  }
  // #endregion public methods

  // #region initialize requests
  protected async initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): Promise<void> {
    await this.request(response, async() => {
      await initializeRequest(response, args);
    });
  }
  protected async launchRequest(response: DebugProtocol.LaunchResponse, config: NormalizedDebugConfig): Promise<void> {
    await this.request(response, async() => {
      this.config = config;
      this.registerEvents();

      this.runtime = await launchRequest(this, response);
      this.evaluator = createEvaluator(this.runtime.session);
    }, async() => {
      this.sendEvent(new InitializedEvent());
      return Promise.resolve();
    });
  }
  protected async attachRequest(response: DebugProtocol.AttachResponse, config: NormalizedDebugConfig): Promise<void> {
    await this.request(response, async() => {
      this.config = config;
      this.registerEvents();

      this.runtime = await attachRequest(this, response);
    }, async() => {
      this.sendEvent(new InitializedEvent());
      return Promise.resolve();
    });
  }
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await configurationDoneRequest(this, response, args);
    });
  }
  // #endregion initialize requests

  // #region termination requests
  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await disconnectRequest(this, response, args);
    });
  }
  protected async restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      return Promise.resolve();
    });
  }
  // #endregion termination requests

  // #region user-interaction requests
  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await setBreakPointsRequest(this, response, args);
    });
  }
  protected async setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await setFunctionBreakPointsRequest(this.runtime, response, args);
    });
  }
  protected async setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await setExceptionBreakPointsRequest(this, response, args);
    });
  }
  protected async exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await exceptionInfoRequest(this, response, args);
    });
  }
  protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await setVariableRequest(this.runtime, response, args);
    });
  }
  protected async setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await setExpressionRequest(this.runtime, response, args);
    });
  }
  protected async completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await completionsRequest(this.runtime, response, args);
    });
  }
  protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await evaluateRequest(this, response, args);
    });
  }
  // #endregion user-interaction requests

  // #region stop-event lifecycle requests
  protected async threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      this.resetLifetimeOfObjectsReferences();

      await threadsRequest(this, response);
    });
  }
  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await stackTraceRequest(this, response, args);
    });
  }
  protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await scopesRequest(this, response, args);
    });
  }
  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await variablesRequest(this, response, args);
    });
  }
  // #endregion stop-event lifecycle requests

  // #region execution requests
  protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await continueRequest(this, response, args);
    });
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await nextRequest(this, response, args);
    });
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await stepInRequest(this, response, args);
    });
  }
  protected async stepInTargetsRequest(response: DebugProtocol.StepInTargetsResponse, args: DebugProtocol.StepInTargetsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await stepInTargetsRequest(this.runtime, response, args);
    });
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await stepOutRequest(this, response, args);
    });
  }
  protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    await this.request(response, async() => {
      await pauseRequest(this, response, args);
    });
  }
  private async request<T>(response: DebugProtocol.Response, responseHandler: () => Promise<T>, responsedHandler?: () => Promise<T>): Promise<void> {
    if (this.isTerminateRequested) {
      return;
    }

    try {
      console.log(response.command);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.runtime?.isClosed) {
        this.sendTerminatedEvent();
        return;
      }
      await this.mutex.use('', responseHandler);
    }
    catch (e: unknown) {
      if (e instanceof CriticalError) {
        console.log(e);
        this.sendTerminatedEvent();
      }
      if (e instanceof Error) {
        console.log(e);
      }
    }
    finally {
      this.sendResponse(response);
      await responsedHandler?.();
    }
  }
  // #endregion execution requests
  // #region private methods
  private registerEvents(): void {
    this.eventManager.on('process:stdout', (message) => {
      this.sendOutputMessage(message, 'stdout');
    });
    this.eventManager.on('process:stderr', (message) => {
      this.sendOutputMessage(message, 'stderr');
    });
    this.eventManager.on('debugger:stdout', (message) => {
      this.sendOutputMessage(message, 'stdout');
    });
    this.eventManager.on('debugger:stderr', (message) => {
      if (this.config.useOutputDebug === false) {
        return;
      }

      this.sendOutputMessage(message, this.config.useOutputDebug.category);
    });

    const terminatedListener = (errOrCode?: number | Error): void => {
      this.sendTerminatedEvent(errOrCode);
    };
    this.eventManager.on('process:close', terminatedListener);
    this.eventManager.on('process:error', terminatedListener);
    this.eventManager.on('debugger:error', terminatedListener);
    this.eventManager.on('debugger:close', terminatedListener);
  }
  private async resetLifetimeOfObjectsReferences(): Promise<void> {
    // https://microsoft.github.io/debug-adapter-protocol/overview#lifetime-of-objects-references
    this.variablesReferenceManager.reset();
    return Promise.resolve();
  }
  // #endregion private methods
}
