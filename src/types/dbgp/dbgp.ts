/**
 * This file models the DBGP with reference to the `https://xdebug.org/docs/dbgp`.
 * Comments beginning with `// >` indicate quotations from it.
 */

// #region data
// #region Version
export type DecimalNumber = number;
export type FloatNumber = number;
// #endregion Version

// #region FileName
export type FileName = FileUri | VirtualFileUri;

// https://xdebug.org/docs/dbgp#file-paths
export type FileUri = `${'file://'}${string}`;

// https://xdebug.org/docs/dbgp#dynamic-code-and-virtual-files
export type VirtualFileUri = `${'dbgp://'}${string}`;
// #endregion FileName

// #region Stream
export type StreamType = 'stdout' | 'stderr';
export type Encoding = 'base64' | (string & { ThisIsLiteralUnionTrick: any });
// #endregion Stream

// #region Status
// https://xdebug.org/docs/dbgp#status
export type RunState
  = 'starting' // > State prior to execution of any code
  | 'stopping' // > State after completion of code execution. This typically happens at the end of code execution, allowing the IDE to further interact with the debugger engine (for example, to collect performance data, or use other extended commands).
  | 'stopped'  // > IDE is detached from process, no further interaction is possible.
  | 'running'  // > code is currently executing. Note that this state would only be seen with async support turned on, otherwise the typical state during IDE/debugger interaction would be 'break'
  | 'break';    // > code execution is paused, for whatever reason (see below), and the IDE/debugger can pass information back and forth.
export type StatusReason = 'ok' | 'error' | 'aborted' | 'exception';
// #endregion Status

// #region Command
// https://xdebug.org/docs/dbgp#core-commands
export type CommandName
= 'status'
| 'feature_get'
| 'feature_set'
| ContinuationCommandName
| BreakpointCommandName
| StackCommandName
| 'notify'
| ContextCommandName
| 'typemap_get'
| PropertyCommandName
| 'source'
| 'stdout'
| 'stderr'
| ExtendedCommandName;

// https://xdebug.org/docs/dbgp#continuation-commands
export type RequireContinuationCommandName
  = 'run'         // > starts or resumes the script until a new breakpoint is reached, or the end of the script is reached.
  | 'step_into'   // > steps to the next statement, if there is a function call involved it will break on the first statement in that function
  | 'step_over'   // > steps to the next statement, if there is a function call on the line from which the step_over is issued then the debugger engine will stop at the statement after the function call in the same scope as from where the command was issued
  | 'step_out'    // > steps out of the current scope and breaks on the statement after returning from the current function. (Also called 'finish' in GDB)
  | 'stop';       // > ends execution of the script immediately, the debugger engine may not respond, though if possible should be designed to do so. The script will be terminated right away and be followed by a disconnection of the network connection from the IDE (and debugger engine if required in multi request apache processes).
export type OptionalContinuationCommandName
  = 'detach';     // > stops interaction with the debugger engine. Once this command is executed, the IDE will no longer be able to communicate with the debugger engine. This does not end execution of the script as does the stop command above, but rather detaches from debugging. Support of this continuation command is optional, and the IDE should verify support for it via the feature_get command. If the IDE has created stdin/stdout/stderr pipes for execution of the script (eg. an interactive shell or other console to catch script output), it should keep those open and usable by the process until the process has terminated normally.
export type ContinuationCommandName = RequireContinuationCommandName | OptionalContinuationCommandName;

export type BreakpointCommandName
  = 'breakpoint_set'
  | 'breakpoint_get'
  | 'breakpoint_update'
  | 'breakpoint_remove'
  | 'breakpoint_list';
export type StackCommandName
  = 'stack_depth'
  | 'stack_get';
export type ContextCommandName
  = 'context_names'
  | 'context_get';
export type PropertyCommandName
  = 'property_get'
  | 'property_set'
  | 'property_value';
export type EvalCommandName
  = 'eval'
  | 'expr'
  | 'exec';
export type SpawnPointCommandName
  = 'spawnpoint_set'
  | 'spawnpoint_get'
  | 'spawnpoint_update'
  | 'spawnpoint_remove'
  | 'spawnpoint_list';
export type ExtendedCommandName
  = 'stdin'
  | 'break'
  | EvalCommandName
  | SpawnPointCommandName;
// #endregion Command

// #region Feature
// https://xdebug.org/docs/dbgp#options-and-configuration
export type RequireFeatureName
  = 'language_supports_threads' // > get     | [0|1]
  | 'language_name'             // > get     | {eg. PHP, Python, Perl}
  | 'language_version'          // > get/set | {version string}
  | 'encoding'                  // > get     | current encoding in use by the debugger session. The encoding can either be (7-bit) ASCII, or a code set which contains ASCII (Ex: ISO-8859-X, UTF-8). Use the supported_encodings feature to query which encodings are supported
  | 'protocol_version'          // > get     | {for now, always 1}
  | 'supports_async'            // > get     | {for commands such as break}
  | 'data_encoding'             // > get     | optional, allows to turn off the default base64 encoding of data. This should only be used for development and debugging of the debugger engines themselves, and not for general use. If implemented the value 'base64' must be supported to turn back on regular encoding. the value 'none' means no encoding is in use. all elements that use encoding must include an encoding attribute.
  | 'breakpoint_languages'      // > get     | some engines may support more than one language. This feature returns a string which is a comma separated list of supported languages. If the engine does not provide this feature, then it is assumed that the engine only supports the language defined in the feature language_name. One example of this is an XSLT debugger engine which supports XSLT, XML, HTML and XHTML. An IDE may need this information to to know what types of breakpoints an engine will accept.
  | 'breakpoint_types'          // > get     | returns a space separated list with all the breakpoint types that are supported. See 7.6 breakpoints for a list of the 6 defined breakpoint types.
  | 'multiple_sessions'         // > get/set | {0|1}
  | 'max_children'              // > get/set | max number of array or object children to initially retrieve
  | 'max_data'                  // > get/set | max amount of variable data to initially retrieve.
  | 'max_depth';                // > get/set | maximum depth that the debugger engine may return when sending arrays, hashs or object structures to the IDE.
export type OptionalFeatureName
  = 'breakpoint_details'        // > get/set | whether breakpoint information is included in the response to a continuation command, when the debugger hits a 'break' state (for example, when encountering a breakpoint)
  | 'extended_properties'       // > get/set | {0|1} Extended properties are required if there are property names (name, fullname or classname) that can not be represented as valid XML attribute values (such as &#0;). See also 7.11 Properties, variables and values.
  | 'notify_ok'                 // > get/set | [0|1] See section 8.5 Notifications.
  | 'resolved_breakpoints'      // > get/set | whether 'breakpoint_resolved' notifications may be send by the debugging engine in case it is supported. See the resolved attribute under 7.6 breakpoints for further information.
  | 'supported_encodings'       // > get     | returns a comma separated list of all supported encodings that can be set through the encoding feature
  | 'supports_postmortem'       // > get     | [0|1] This feature lets an IDE know that there is benefit to continuing interaction during the STOPPING state (sect. 7.1).
  | 'show_hidden';              // > get/set | [0|1] This feature can get set by the IDE if it wants to have more detailed internal information on properties (eg. private members of classes, etc.) Zero means that hidden members are not shown to the IDE.
export type FeatureName = RequireContinuationCommandName | OptionalFeatureName;
// #endregion Feature

// #region Breakpoint
// https://xdebug.org/docs/dbgp#breakpoints
export type BreakpointId = DecimalNumber;
export type BreakpointType
  = 'line'              // > break on the given lineno in the given file
  | 'call'              // > break on entry into new stack for function name
  | 'return'            // > break on exit from stack for function name
  | 'exception'         // > break on exception of the given name
  | 'conditional'       // > break when the given expression is true at the given filename and line number or just in given filename
  | 'watch';            // > break on write of the variable or address defined by the expression argument
export type BreakpointState = 'enabled' | 'disabled';

export type Condition = ExpressionCondition | HitCondition | (ExpressionCondition & HitCondition);
export type ExpressionCondition = { expression: string };
export type HitConditionOperator = '>=' | '==' | '%';
export type HitCondition = { operator?: HitConditionOperator; value: string };
export interface BreakpointBase {
  type: BreakpointType;
  id: number;
  state: BreakpointState;
  temporary: boolean;
  readonly resolved: boolean;
  hitCount?: string;
  hitValue?: number;
  hitCondition?: string;
}
export type Breakpoint
  = LineBreakpoint
  | CallBreakpoint
  | FunctionBreakpoint
  | ReturnBreakpoint
  | ExceptionBreakpoint
  | ConditionalBreakpoint
  | WatchBreakpoint;
export interface LineBreakpoint extends BreakpointBase {
  type: 'line';
  line: DecimalNumber;
  fileName: FileName;
}
export interface CallBreakpoint extends BreakpointBase {
  type: 'call';
  functionName: string;
}
export type FunctionBreakpoint = CallBreakpoint;
export interface ReturnBreakpoint extends BreakpointBase {
  type: 'return';
  functionName: string;
}
export interface ExceptionBreakpoint extends BreakpointBase {
  type: 'exception';
  exception: string;
}
export interface ConditionalBreakpoint extends BreakpointBase {
  type: 'conditional';
  fileName: FileName;
  expressionType: 'conditional';
  expression: string;
}
export interface WatchBreakpoint extends BreakpointBase {
  type: 'watch';
  expressionType: 'watch';
  expression: string;
}
// #endregion Breakpoint

// #region Stack
// https://xdebug.org/docs/dbgp#stack-get
export type StackType = 'file' | 'eval';
export type LineNumber = DecimalNumber;
export type CharacterNumber = DecimalNumber;
export type CmdRange = `${LineNumber}:${CharacterNumber}`;
export interface Stack {
  level: number;
  type: StackType;
  fileName: FileName;
  line: number;
  where?: string;
  cmdbegin?: CmdRange;
  cmdend?: CmdRange;
}
// #endregion Stack

// #region Context
// https://xdebug.org/docs/dbgp#context-get
export type ContextId = number;
export type ContextNames = 'Local' | 'Global' | (string & { ThisIsLiteralUnionTrick: any });
export interface Context {
  id: ContextId;
  name: ContextNames;
}
// #endregion Context

// #region TypeMap
export type DataTypeName = string;
export type DataType = string;
export interface TypeMap {
  name: DataTypeName;
  type: DataType;
}
// #endregion TypeMap

// #region Property
export type PropertyFacet = string;
// https://xdebug.org/docs/dbgp#properties-variables-and-values
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  name: string;
  fullName: string;
  type: DataType;
  constant: boolean;
  facet?: PropertyFacet;
  size: number;       // > size of property data in bytes
  key?: number;       // Unique ID identifying the property
  address: number;
  encoding: Encoding;
}
export interface PrimitiveProperty extends PropertyBase {
  value: string;
}
export interface ObjectProperty extends PropertyBase {
  className: string;
  page: number;
  pageSize: number;
  hasChildren: boolean;
  children: Property[];
  numChildren?: number;
}
// #endregion Property

// #region StdOut StdErr
export const enum OutputControl {
  Disable = 0,
  Copy = 1,
  Redirect = 2,
}
// #endregion StdOut StdErr

// #region StdIn
export const enum InputControl {
  Disable = 0,
  Redirect = 1,
}
// #endregion StdOut StdErr

// #region SpawnPoint
// https://xdebug.org/docs/dbgp#spawnpoints
export type SpawnPointId = number;
export interface SpawnPoint {
  id: SpawnPointId;
  state: boolean;
  fileName: FileName;
  line: LineNumber;
}
// #endregion SpawnPoint
// #endregion data

// #region Error
// https://xdebug.org/docs/dbgp#error-codes
export const commandParsingErrorNumbers = [
  0,        // > no error
  1,        // > parse error in command
  2,        // > duplicate arguments in command
  3,        // > invalid options (ie, missing a required option, invalid value for a passed option, not supported feature)
  4,        // > Unimplemented command
  5,        // > Command not available (Is used for async commands. For instance if the engine is in state "run" then only "break" and "status" are available).
] as const;
export const fileRelatedErrorNumbers = [
  100,      // > can not open file (as a reply to a "source" command if the requested source file can't be opened)
  101,      // > stream redirect failed
] as const;
export const breakpointOrCodeflowErrorNumbers = [
  200,      // > breakpoint could not be set (for some reason the breakpoint could not be set due to problems registering it)
  201,      // > breakpoint type not supported (for example I don't support 'watch' yet and thus return this error)
  202,      // > invalid breakpoint (the IDE tried to set a breakpoint on a line that does not exist in the file (ie "line 0" or lines past the end of the file)
  203,      // > no code on breakpoint line (the IDE tried to set a breakpoint on a line which does not have any executable code. The debugger engine is NOT required to return this type if it is impossible to determine if there is code on a given location. (For example, in the PHP debugger backend this will only be returned in some special cases where the current scope falls into the scope of the breakpoint to be set)).
  204,      // > Invalid breakpoint state (using an unsupported breakpoint state was attempted)
  205,      // > No such breakpoint (used in breakpoint_get etc. to show that there is no breakpoint with the given ID)
  206,      // > Error evaluating code (use from eval() (or perhaps property_get for a full name get))
  207,      // > Invalid expression (the expression used for a non-eval() was invalid)
] as const;
export const dataErrorNumbers = [
  300,      // > Can not get property (when the requested property to get did not exist, this is NOT used for an existing but uninitialized property, which just gets the type "uninitialised" (See: PreferredTypeNames)).
  301,      // > Stack depth invalid (the -d stack depth parameter did not exist (ie, there were less stack elements than the number requested) or the parameter was < 0)
  302,      // > Context invalid (an non existing context was requested)
] as const;
export const protocolErrorNumbers = [
  900,      // > Encoding not supported
  998,      // > An internal exception in the debugger occurred
  999,      // > Unknown error
] as const;
export const errorNumbers = [
  ...commandParsingErrorNumbers,
  ...fileRelatedErrorNumbers,
  ...breakpointOrCodeflowErrorNumbers,
  ...dataErrorNumbers,
  ...protocolErrorNumbers,
] as const;
export type ErrorNumber = typeof errorNumbers[number];
export interface ResponseError {
  code: ErrorNumber;
}
// #endregion Error

// #region Packet
export type PacketName = 'init' | 'stream' | 'response' | 'notify';
export type Packet = InitPacket | StreamPacket | ResponsePacket | NotifyResponse;

// https://xdebug.org/docs/dbgp#connection-initialization
export interface InitPacket {
  init: InitResponse;
}

// https://xdebug.org/docs/dbgp#stream
export interface StreamPacket {
  stream: StreamResponse;
}

// https://xdebug.org/docs/dbgp#response
export interface ResponsePacket {
  response: CommandResponse;
}

// https://xdebug.org/docs/dbgp#notify
export interface NotifyPacket {
  notify: NotifyResponse;
}
// #endregion Packet

// #region Response
// https://xdebug.org/docs/dbgp#connection-initialization
export interface InitResponse {
  fileName: FileName;
  appId: string;
  ideKey: string;
  session: string;
  thread: string;
  parent: string;
  language: string;
  protocolVersion: string;
}

// https://xdebug.org/docs/dbgp#stream
export interface StreamResponse {
  type: StreamType;
  encoding: Encoding;
  data: string;
}

// https://xdebug.org/docs/dbgp#notify
export interface NotifyResponse {
  name: string;
  encoding: Encoding;
  data: string;
}

export type CommandResponse
  = StatusResponse
  | FeatureGetResponse
  | FeatureSetResponse
  | ContinuationResponse
  | BreakpointGetResponse
  | BreakpointSetResponse
  | BreakpointUpdateResponse
  | BreakpointRemoveResponse
  | BreakpointListResponse
  | StackDepthResponse
  | StackGetResponse
  | ContextNamesResponse
  | ContextGetResponse
  | PropertyGetResponse
  | PropertySetResponse
  | PropertyValueResponse
  | SourceResponse
  | StdOutResponse
  | StdErrResponse;
export interface CommandResponseBase {
  command: CommandName;
  transactionId: number;
  error?: ResponseError;
}

// https://xdebug.org/docs/dbgp#status
export interface StatusResponse extends CommandResponseBase {
  status: RunState;
  reason: StatusReason;
}

// https://xdebug.org/docs/dbgp#feature-get
export interface FeatureGetResponse extends CommandResponseBase {
  command: 'feature_get';
  featureName: FeatureName;
  supported: boolean;
}

// https://xdebug.org/docs/dbgp#feature-set
export interface FeatureSetResponse extends CommandResponseBase {
  command: 'feature_set';
  featureName: FeatureName;
  success: boolean;
}

// https://xdebug.org/docs/dbgp#continuation-commands
export interface ContinuationResponse extends StatusResponse {
  command: ContinuationCommandName;
  breakpoint?: Breakpoint;
}

// https://xdebug.org/docs/dbgp#id4
export interface BreakpointGetResponse extends CommandResponseBase {
  command: 'breakpoint_get';
  breakpoint: Breakpoint;
}

// https://xdebug.org/docs/dbgp#id3
export interface BreakpointSetResponse extends CommandResponseBase {
  command: 'breakpoint_set';
  state: BreakpointState;
  resolved: boolean;
}

// https://xdebug.org/docs/dbgp#id5
export interface BreakpointUpdateResponse extends CommandResponseBase {
  command: 'breakpoint_update';
}

// https://xdebug.org/docs/dbgp#id6
export interface BreakpointRemoveResponse extends CommandResponseBase {
  command: 'breakpoint_remove';
}

// https://xdebug.org/docs/dbgp#id7
export interface BreakpointListResponse extends CommandResponseBase {
  command: 'breakpoint_list';
  breakpoints: Breakpoint[];
}

// https://xdebug.org/docs/dbgp#stack-depth
export interface StackDepthResponse extends CommandResponseBase {
  command: 'stack_depth';
  depth: number;
}

// https://xdebug.org/docs/dbgp#stack-get
export interface StackGetResponse extends CommandResponseBase {
  command: 'stack_get';
  stacks: Stack[];
}

// https://xdebug.org/docs/dbgp#context-names
export interface ContextNamesResponse extends CommandResponseBase {
  command: 'context_names';
  contexts: Context[];
}

// https://xdebug.org/docs/dbgp#context-get
export interface ContextGetResponse extends CommandResponseBase {
  command: 'context_get';
  context: Context;
}

// https://xdebug.org/docs/dbgp#typemap-get
export interface TypeMapGetResponse extends CommandResponseBase {
  types: TypeMap[];
}

// https://xdebug.org/docs/dbgp#property-get-property-set-property-value
export interface PropertySetResponse extends CommandResponseBase {
  command: 'property_set';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#property-get-property-set-property-value
export interface PropertyGetResponse extends CommandResponseBase {
  command: 'property_get';
  property: Property;
}

// https://xdebug.org/docs/dbgp#property-get-property-set-property-value
export interface PropertyValueResponse extends CommandResponseBase {
  command: 'property_value';
  data: string;
  size: number;
  encoding: Encoding | 'none';
}

// https://xdebug.org/docs/dbgp#source
export interface SourceResponse extends CommandResponseBase {
  command: 'source';
  success: boolean;
  data: string;
}

// https://xdebug.org/docs/dbgp#stdout-stderr
export interface StdOutResponse extends CommandResponseBase {
  command: 'stdout';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#stdout-stderr
export interface StdErrResponse extends CommandResponseBase {
  command: 'stderr';
  success: boolean;
}
// https://xdebug.org/docs/dbgp#stdin
export interface StdInResponse extends CommandResponseBase {
  command: 'stdin';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#break
export interface BreakResponse extends CommandResponseBase {
  command: 'break';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#eval
export interface EvalResponse extends CommandResponseBase {
  command: 'eval';
  success: boolean;
  property: Property;
}

// https://xdebug.org/docs/dbgp#expr
export interface ExprResponse extends CommandResponseBase {
  command: 'expr';
  success: boolean;
  property: Property;
}

// https://xdebug.org/docs/dbgp#exec
export interface ExecResponse extends CommandResponseBase {
  command: 'exec';
  success: boolean;
  property: Property;
}

// https://xdebug.org/docs/dbgp#id8
export interface SpawnpointSetResponse extends CommandResponseBase {
  command: 'spawnpoint_set';
  id: SpawnPointId;
  state: boolean;
}

// https://xdebug.org/docs/dbgp#id9
export interface SpawnpointSetResponse extends CommandResponseBase {
  command: 'spawnpoint_set';
  id: SpawnPointId;
  state: boolean;
}

// https://xdebug.org/docs/dbgp#id10
export interface SpawnpointUpdateResponse extends CommandResponseBase {
  command: 'spawnpoint_update';
}

// https://xdebug.org/docs/dbgp#id11
export interface SpawnpointRemoveResponse extends CommandResponseBase {
  command: 'spawnpoint_remove';
}

// https://xdebug.org/docs/dbgp#id12
export interface SpawnpointListResponse extends CommandResponseBase {
  command: 'spawnpoint_list';
  spawnpoints: SpawnPoint[];
}
// #endregion Response

// #region client
export type CommandSession = RequireCommandSession | ExtendedCommandSession;
export interface RequireCommandSession {
  sendStatusCommand: () => Promise<StatusResponse>;                                                                                       // $ status -i TRANSACTION_ID
  sendFeatureGetCommand: (featureName: FeatureName) => Promise<FeatureSetResponse>;                                                       // $ feature_get -i TRANSACTION_ID -n FEATURE_NAME
  sendFeatureSetCommand: (featureName: FeatureName, value: string) => Promise<FeatureSetResponse>;                                        // $ feature_set -i TRANSACTION_ID -n FEATURE_NAME -v VALUE
  sendRunCommand: () => Promise<ContinuationResponse>;                                                                                    // $ run -i TRANSACTION_ID
  sendStepIntoCommand: () => Promise<ContinuationResponse>;                                                                               // $ step_into -i TRANSACTION_ID
  sendStepOverCommand: () => Promise<ContinuationResponse>;                                                                               // $ step_over -i transaction_id
  sendStepOutCommand: () => Promise<ContinuationResponse>;                                                                                // $ step_out -i TRANSACTION_ID
  sendStopCommand: () => Promise<ContinuationResponse>;                                                                                   // $ stop -i TRANSACTION_ID
  sendDetachCommand: () => Promise<ContinuationResponse>;                                                                                 // $ detach -i TRANSACTION_ID
  sendBreakpointGetCommand: () => Promise<BreakpointGetResponse>;                                                                         // $ breakpoint_get -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointSetCommand: (fileName: FileName, line: LineNumber, condition?: Condition) => Promise<BreakpointSetResponse>;              // $ breakpoint_set -i TRANSACTION_ID -t "line" -s STATE -f FILE_NAME -n LINE_NUMBER
  sendConditionalBreakpointSetCommand: (fileName: FileName, line: LineNumber, condition: Condition) => Promise<BreakpointSetResponse>;    // $ breakpoint_set -i TRANSACTION_ID -t "conditional" -s STATE -f FILE_NAME -n LINE_NUMBER [-h HIT_VALUE -o HIT_CONDITION -- base64(EXPRESSION)]
  sendCallBreakpointSetCommand: (functionName: string, hitCondition?: HitCondition) => Promise<BreakpointSetResponse>;                    // $ breakpoint_set -i TRANSACTION_ID -t "call" -s STATE -m FUNCTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendFunctionBreakpointSetCommand: RequireCommandSession['sendCallBreakpointSetCommand'];                                                              //
  sendReturnBreakpointSetCommand: (functionName: string) => Promise<BreakpointSetResponse>;                                               // $ breakpoint_set -i TRANSACTION_ID -t "return" -s STATE -m FUNCTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendExceptionBreakpointSetCommand: (exception: string) => Promise<BreakpointSetResponse>;                                               // $ breakpoint_set -i TRANSACTION_ID -t "exception" -s STATE -x EXCEPTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendBreakpointUpdateCommand: (breakpointId: BreakpointId) => Promise<BreakpointUpdateResponse>;                                         // $ breakpoint_update -i TRANSACTION_ID -d BREAKPOINT_ID [ -s STATE -n LINE_NUMBER -h HIT_VALUE -o HIT_CONDITION ]
  sendBreakpointRemoveCommand: (breakpointId: BreakpointId) => Promise<BreakpointRemoveResponse>;                                         // $ breakpoint_remove -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointListCommand: () => Promise<BreakpointListResponse>;                                                                       // $ breakpoint_list -i TRANSACTION_ID
  sendStackDepthCommand: () => Promise<StackDepthResponse>;                                                                               // $ stack_depth -i TRANSACTION_ID
  sendStackGetCommand: (stackDepth?: number) => Promise<StackGetResponse>;                                                                     // $ stack_get -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextNamesCommand: (stackDepth?: number) => Promise<ContextNamesResponse>;                                                             // $ context_names -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextGetCommand: (contextId?: ContextId, depth?: number) => Promise<ContextGetResponse>;                                          // $ context_get -i TRANSACTION_ID [ -d STACK_DEPTH -c CONTEXT_NUMBER ]
  sendTypeMapGetCommand: () => Promise<TypeMapGetResponse>;                                                                               // $ typemap_get -i TRANSACTION_ID
  sendPropertyGetCommand: (propertyLongName: string, depth?: number) => Promise<PropertyGetResponse>;                                     // $ property_get -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendPropertySetCommand: (propertyLongName: string, depth?: number) => Promise<PropertySetResponse>;                                     // $ property_set -i TRANSACTION_ID -n PROPERTY_LONG_NAME -l DATA_LENGTH [ -d STACK_DEPTH ] -- DATA
  sendPropertyValueCommand: (propertyLongName: string, depth?: number) => Promise<PropertyValueResponse>;                                 // $ property_value -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendSourceCommand: (fileName: FileName) => Promise<SourceResponse>;                                                                     // $ source -i TRANSACTION_ID -f FILEURI
  sendStdOutCommand: (outputControl: OutputControl) => Promise<StdOutResponse>;                                                           // $ stdout -i transaction_id -c OUTPUT_CONTROL
  sendStdErrCommand: (outputControl: OutputControl) => Promise<StdOutResponse>;                                                           // $ stderr -i transaction_id -c OUTPUT_CONTROL
}
export interface ExtendedCommandSession {
  sendStdInOptionSetCommand: (inputControl: InputControl) => Promise<StdOutResponse>;                                                     // $ stdin -i TRANSACTION_ID -c INPUT_OUTPUT
  sendStdInCommand: (text: string) => Promise<StdOutResponse>;                                                                            // $ stdin -i TRANSACTION_ID -- base64(TEXT)
  sendBreakCommand: () => Promise<BreakResponse>;                                                                                         // $ break -i TRANSACTION_ID
  sendEvalCommand: (stackDepth?: number, dataPage?: number) => Promise<EvalResponse>;                                                     // $ eval -i TRANSACTION_ID [ -p DATA_PAGE -d STACK_DEPTH ] -- DATA
  sendExprCommand: (stackDepth?: number, dataPage?: number) => Promise<ExprResponse>;                                                     // $ expr -i TRANSACTION_ID [ -p DATA_PAGE -d STACK_DEPTH ] -- DATA
  sendExecCommand: (stackDepth?: number, dataPage?: number) => Promise<ExecResponse>;                                                     // $ exec -i TRANSACTION_ID [ -p DATA_PAGE -d STACK_DEPTH ] -- DATA
}
// #endregion client
