import { Server, Socket } from 'net';
import { BreakResponse, BreakpointGetResponse, BreakpointId, BreakpointListResponse, BreakpointRemoveResponse, BreakpointSetResponse, BreakpointUpdateResponse, CommandName, CommandResponse, Condition, ContextGetResponse, ContextId, ContextNamesResponse, ContinuationResponse, FeatureName, FeatureSetResponse, FileName, HitCondition, InitPacket, LineNumber, OutputControl, PropertyGetResponse, PropertySetResponse, PropertyValueResponse, SourceResponse, StackDepthResponse, StackGetResponse, StatusResponse, StdOutResponse, StreamPacket, TypeMapGetResponse } from '../dbgp/ExtendAutoHotkeyDebugger';

export interface DebugServer {
  server: Server;
  socket: Socket;
  session: Session;
}
export type MessageHandler<P> = (server: DebugServer, packet: P[keyof P]) => void;
export interface MessageHandlers {
  init: MessageHandler<InitPacket>;
  stream: MessageHandler<StreamPacket>;
}
export interface Session extends RequireCommandSession, ExtendedCommandSession {
  init: (port: number, hostname: string) => Promise<void>;
}
export type CommandSender<R extends CommandResponse = CommandResponse> = (command: CommandName, args: string, data?: string) => Promise<R>;
export type CommandSession = RequireCommandSession | ExtendedCommandSession;
export interface RequireCommandSession {
  sendStatusCommand: () => Promise<StatusResponse>;                                                                                           // $ status -i TRANSACTION_ID
  sendFeatureGetCommand: (featureName: FeatureName) => Promise<FeatureSetResponse>;                                                           // $ feature_get -i TRANSACTION_ID -n FEATURE_NAME
  sendFeatureSetCommand: (featureName: FeatureName, value: string) => Promise<FeatureSetResponse>;                                            // $ feature_set -i TRANSACTION_ID -n FEATURE_NAME -v VALUE
  sendRunCommand: () => Promise<ContinuationResponse>;                                                                                        // $ run -i TRANSACTION_ID
  sendStepIntoCommand: () => Promise<ContinuationResponse>;                                                                                   // $ step_into -i TRANSACTION_ID
  sendStepOverCommand: () => Promise<ContinuationResponse>;                                                                                   // $ step_over -i transaction_id
  sendStepOutCommand: () => Promise<ContinuationResponse>;                                                                                    // $ step_out -i TRANSACTION_ID
  sendStopCommand: () => Promise<ContinuationResponse>;                                                                                       // $ stop -i TRANSACTION_ID
  sendDetachCommand: () => Promise<ContinuationResponse>;                                                                                     // $ detach -i TRANSACTION_ID
  sendBreakpointGetCommand: () => Promise<BreakpointGetResponse>;                                                                             // $ breakpoint_get -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointSetCommand: (fileName: FileName, line: LineNumber, condition?: Condition) => Promise<BreakpointSetResponse>;                  // $ breakpoint_set -i TRANSACTION_ID -t "line" -s STATE -f FILE_NAME -n LINE_NUMBER
  sendConditionalBreakpointSetCommand: (fileName: FileName, line: LineNumber, condition: Condition) => Promise<BreakpointSetResponse>;        // $ breakpoint_set -i TRANSACTION_ID -t "conditional" -s STATE -f FILE_NAME -n LINE_NUMBER [-h HIT_VALUE -o HIT_CONDITION -- base64(EXPRESSION)]
  sendCallBreakpointSetCommand: (functionName: string, hitCondition?: HitCondition) => Promise<BreakpointSetResponse>;                        // $ breakpoint_set -i TRANSACTION_ID -t "call" -s STATE -m FUNCTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendFunctionBreakpointSetCommand: RequireCommandSession['sendCallBreakpointSetCommand'];                                                    //
  sendReturnBreakpointSetCommand: (functionName: string) => Promise<BreakpointSetResponse>;                                                   // $ breakpoint_set -i TRANSACTION_ID -t "return" -s STATE -m FUNCTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendExceptionBreakpointSetCommand: (exception: string) => Promise<BreakpointSetResponse>;                                                   // $ breakpoint_set -i TRANSACTION_ID -t "exception" -s STATE -x EXCEPTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendBreakpointUpdateCommand: (breakpointId: BreakpointId) => Promise<BreakpointUpdateResponse>;                                             // $ breakpoint_update -i TRANSACTION_ID -d BREAKPOINT_ID [ -s STATE -n LINE_NUMBER -h HIT_VALUE -o HIT_CONDITION ]
  sendBreakpointRemoveCommand: (breakpointId: BreakpointId) => Promise<BreakpointRemoveResponse>;                                             // $ breakpoint_remove -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointListCommand: () => Promise<BreakpointListResponse>;                                                                           // $ breakpoint_list -i TRANSACTION_ID
  sendStackDepthCommand: () => Promise<StackDepthResponse>;                                                                                   // $ stack_depth -i TRANSACTION_ID
  sendStackGetCommand: (stackDepth?: number) => Promise<StackGetResponse>;                                                                    // $ stack_get -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextNamesCommand: (stackDepth?: number) => Promise<ContextNamesResponse>;                                                            // $ context_names -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextGetCommand: (contextId?: ContextId, depth?: number) => Promise<ContextGetResponse>;                                              // $ context_get -i TRANSACTION_ID [ -d STACK_DEPTH -c CONTEXT_NUMBER ]
  sendTypeMapGetCommand: () => Promise<TypeMapGetResponse>;                                                                                   // $ typemap_get -i TRANSACTION_ID
  sendPropertyGetCommand: (propertyLongName: string, depth?: number) => Promise<PropertyGetResponse>;                                         // $ property_get -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendPropertySetCommand: (propertyLongName: string, value: string, depth?: number) => Promise<PropertySetResponse>;                          // $ property_set -i TRANSACTION_ID -n PROPERTY_LONG_NAME -l DATA_LENGTH [ -d STACK_DEPTH ] -- DATA
  sendPropertyValueCommand: (propertyLongName: string, depth?: number) => Promise<PropertyValueResponse>;                                     // $ property_value -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendSourceCommand: (fileName: FileName) => Promise<SourceResponse>;                                                                         // $ source -i TRANSACTION_ID -f FILEURI
  sendStdOutCommand: (outputControl: OutputControl) => Promise<StdOutResponse>;                                                               // $ stdout -i transaction_id -c OUTPUT_CONTROL
  sendStdErrCommand: (outputControl: OutputControl) => Promise<StdOutResponse>;                                                               // $ stderr -i transaction_id -c OUTPUT_CONTROL
}
export interface ExtendedCommandSession {
  sendBreakCommand: () => Promise<BreakResponse>;                                                                                             // $ break -i TRANSACTION_ID
}
