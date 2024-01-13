/**
 * This file models the DBGP with reference to the `https://xdebug.org/docs/dbgp`.
 * Comments beginning with `// >` indicate quotations from it.
 */

// #region data
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
export type Reason = 'ok' | 'error' | 'aborted' | 'exception';
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
export type BreakpointType
  = 'line'              // > break on the given lineno in the given file
  | 'call'              // > break on entry into new stack for function name
  | 'return'            // > break on exit from stack for function name
  | 'exception'         // > break on exception of the given name
  | 'conditional'       // > break when the given expression is true at the given filename and line number or just in given filename
  | 'watch';            // > break on write of the variable or address defined by the expression argument
export type BreakpointState = 'enabled' | 'disabled';
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
  | ReturnBreakpoint
  | ExceptionBreakpoint
  | ConditionalBreakpoint
  | WatchBreakpoint;
export interface LineBreakpoint extends BreakpointBase {
  type: 'line';
  line: number;
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
export type LineNumber = number;
export type CharacterNumber = number;
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
export type ContextNames = 'Local' | 'Global' | (string & { ThisIsLiteralUnionTrick: any });
export interface Context {
  id: number;
  name: ContextNames;
}
// #endregion Context

// #region Property
// https://xdebug.org/docs/dbgp#properties-variables-and-values
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  name: string;
  fullName: string;
  type: string;
  constant: boolean;
  facet?: string;
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
export interface ResponceError {
  code: ErrorNumber;
}
// #endregion Error

// #region Packet
export type PacketName = 'init' | 'stream' | 'responce' | 'notify';
export type Packet = InitPacket | StreamPacket | NotifyResponce;

// https://xdebug.org/docs/dbgp#connection-initialization
export interface InitPacket {
  init: InitResponce;
}

// https://xdebug.org/docs/dbgp#stream
export interface StreamPacket {
  stream: StreamResponce;
}

// https://xdebug.org/docs/dbgp#response
export interface ResponcePacket {
  responce: CommandResponce;
}

// https://xdebug.org/docs/dbgp#notify
export interface NotifyPacket {
  notify: NotifyResponce;
}
// #endregion Packet

// #region Responce
// https://xdebug.org/docs/dbgp#connection-initialization
export interface InitResponce {
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
export interface StreamResponce {
  type: StreamType;
  encoding: Encoding;
  data: string;
}

// https://xdebug.org/docs/dbgp#notify
export interface NotifyResponce {
  name: string;
  encoding: Encoding;
  data: string;
}

export type CommandResponce
  = StatusResponse
  | FeatureGetResponse
  | FeatureSetResponse
  | ContinuationResponse
  | BreakpointGetResponce
  | BreakpointSetResponce
  | BreakpointUpdateResponce
  | BreakpointRemoveResponce
  | BreakpointListResponce
  | StackDepthResponce
  | StackGetResponce
  | ContextNamesResponce
  | ContextGetResponce
  | PropertyGetResponse
  | PropertySetResponse
  | PropertyValueResponse
  | SourceResponce
  | StdOutResponce
  | StdErrResponce;
export interface CommandResponseBase {
  command: CommandName;
  transactionId: number;
  error?: ResponceError;
}

// https://xdebug.org/docs/dbgp#status
export interface StatusResponse extends CommandResponseBase {
  status: RunState;
  reason: Reason;
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
export interface BreakpointGetResponce extends CommandResponseBase {
  command: 'breakpoint_get';
  breakpoint: Breakpoint;
}

// https://xdebug.org/docs/dbgp#id3
export interface BreakpointSetResponce extends CommandResponseBase {
  command: 'breakpoint_set';
  state: BreakpointState;
  resolved: boolean;
}

// https://xdebug.org/docs/dbgp#id5
export interface BreakpointUpdateResponce extends CommandResponseBase {
  command: 'breakpoint_update';
}

// https://xdebug.org/docs/dbgp#id6
export interface BreakpointRemoveResponce extends CommandResponseBase {
  command: 'breakpoint_remove';
}

// https://xdebug.org/docs/dbgp#id7
export interface BreakpointListResponce extends CommandResponseBase {
  command: 'breakpoint_list';
  breakpoints: Breakpoint[];
}

// https://xdebug.org/docs/dbgp#stack-depth
export interface StackDepthResponce extends CommandResponseBase {
  command: 'stack_depth';
  depth: number;
}

// https://xdebug.org/docs/dbgp#stack-get
export interface StackGetResponce extends CommandResponseBase {
  command: 'stack_get';
  stacks: Stack[];
}

// https://xdebug.org/docs/dbgp#context-names
export interface ContextNamesResponce extends CommandResponseBase {
  command: 'context_names';
  contexts: Context[];
}

// https://xdebug.org/docs/dbgp#context-get
export interface ContextGetResponce extends CommandResponseBase {
  command: 'context_get';
  context: Context;
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
export interface SourceResponce extends CommandResponseBase {
  command: 'source';
  success: boolean;
  data: string;
}

// https://xdebug.org/docs/dbgp#stdout-stderr
export interface StdOutResponce extends CommandResponseBase {
  command: 'stdout';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#stdout-stderr
export interface StdErrResponce extends CommandResponseBase {
  command: 'stderr';
  success: boolean;
}
// https://xdebug.org/docs/dbgp#stdin
export interface StdInResponce extends CommandResponseBase {
  command: 'stdin';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#break
export interface BreakResponce extends CommandResponseBase {
  command: 'break';
  success: boolean;
}

// https://xdebug.org/docs/dbgp#eval
export interface EvalResponce extends CommandResponseBase {
  command: 'eval';
  success: boolean;
  property: Property;
}

// https://xdebug.org/docs/dbgp#expr
export interface ExprResponce extends CommandResponseBase {
  command: 'expr';
  success: boolean;
  property: Property;
}

// https://xdebug.org/docs/dbgp#exec
export interface ExecResponce extends CommandResponseBase {
  command: 'exec';
  success: boolean;
  property: Property;
}

// https://xdebug.org/docs/dbgp#id8
export interface SpawnpointSetResponce extends CommandResponseBase {
  command: 'spawnpoint_set';
  id: SpawnPointId;
  state: boolean;
}

// https://xdebug.org/docs/dbgp#id9
export interface SpawnpointSetResponce extends CommandResponseBase {
  command: 'spawnpoint_set';
  id: SpawnPointId;
  state: boolean;
}

// https://xdebug.org/docs/dbgp#id10
export interface SpawnpointUpdateResponce extends CommandResponseBase {
  command: 'spawnpoint_update';
}

// https://xdebug.org/docs/dbgp#id11
export interface SpawnpointRemoveResponce extends CommandResponseBase {
  command: 'spawnpoint_remove';
}

// https://xdebug.org/docs/dbgp#id12
export interface SpawnpointListResponce extends CommandResponseBase {
  command: 'spawnpoint_list';
  spawnpoints: SpawnPoint[];
}
// #endregion Responce
