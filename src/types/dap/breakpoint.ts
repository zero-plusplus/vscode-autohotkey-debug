import { BreakpointType, CharacterNumber, Expression, FileName, HitCondition, LineNumber } from '../dbgp/ExtendAutoHotkeyDebugger';
import { Session } from './session';

export interface BreakpointData {
  kind: Omit<BreakpointType, 'call'> | 'function';
  temporary?: boolean;
  condition?: Expression;
  hitCondition?: HitCondition;
  log?: string;
}
export interface BreakpointBase extends BreakpointData {
  id: number;
  action: BreakpointAction;
  /**
   * Whether the breakpoint has been verified by the debugger.
   *
   * For example, if a breakpoint was placed on line 1 of the following code, the debugger validation will treat it as if the breakpoint was placed on line 3.
   *
   * ```ahk
   * 1| ; Set breakpoints here
   * 2|
   * 3|test := "Actual breakpoint locations here."
   * ```
   */
  verified: boolean;
  customVertify?: () => [ LineNumber, CharacterNumber? ];
  unverifiedLine: number;
  unverifiedColumn: number;
}
export type BreakpointAction = (session: Session) => Promise<void>;
export type Breakpoint
  = LineBreakpoint
  | FunctionBreakpoint
  | Logpoint;

export interface LineBreakpointBase extends BreakpointData {
  fileName: FileName;
  line: LineNumber;
  character?: CharacterNumber;
}
export interface LineBreakpoint extends LineBreakpointBase {
  kind: 'line';
}
export interface NamedBreakpointBase extends BreakpointBase {
  name: string;
}
export interface FunctionBreakpoint extends NamedBreakpointBase {
  kind: 'function';
}
export interface ReturnBreakpoint extends NamedBreakpointBase {
  kind: 'return';
}
export interface ExceptionBreakpoint extends NamedBreakpointBase {
  kind: 'exception';
}
export interface Logpoint extends LineBreakpointBase {
  kind: 'log';
  log: string;
}
export type Breakpoints = Breakpoint[];
