import * as dbgp from '../../../dbgp/AutoHotkeyDebugger.types';
import { Session } from '../../../dbgp/session.types';
import { VisibleCondition } from '../../../dap/variableCategory.types';

export type BreakpointKind = Omit<dbgp.BreakpointType, 'call'> | 'function';

// #region configuration of launch.json
export type BreakpointDataArray = Array<BreakpointData | BreakpointDataGroup>;
export type BreakpointData
  = LineBreakpointData
  | LogpointData
  | FunctionBreakpointData
  | ReturnBreakpointData
  | ExceptionBreakpointData;
export interface BreakpointDataBase {
  kind: BreakpointKind;
  hidden: VisibleCondition;
  temporary?: boolean;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}
export interface LineBreakpointDataBase extends BreakpointDataBase {
  fileName: string;
  line: number;
  character?: number;
}
export interface NamedBreakpointDataBase extends BreakpointDataBase {
  name: string;
}

export interface LineBreakpointData extends LineBreakpointDataBase {
  kind: 'line';
}
export interface LogpointData extends LineBreakpointDataBase {
  kind: 'log';
}
export interface FunctionBreakpointData extends NamedBreakpointDataBase {
  kind: 'function';
}
export interface ReturnBreakpointData extends NamedBreakpointDataBase {
  kind: 'return';
}
export interface ExceptionBreakpointData extends NamedBreakpointDataBase {
  kind: 'exception';
}
export interface BreakpointDataGroup {
  label: string;
  breakpoints: BreakpointData[];
}
// #endregion configuration of launch.json

export interface BreakpointBase {
  id: number;
  kind: BreakpointKind;
  state: dbgp.BreakpointState;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  action?: BreakpointAction;
  temporary: boolean;
}
export type BreakpointAction = (session: Session) => Promise<void>;
export type Breakpoint
  = LineBreakpoint
  | FunctionBreakpoint
  | ReturnBreakpoint
  | ExceptionBreakpoint
  | Logpoint;
export type BreakpointWithLine = LineBreakpoint | Logpoint;

export interface LineBreakpointBase extends BreakpointBase {
  fileName: string;
  line: number;
  character?: number;
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
  customVertify?: () => [ /* line */ number, /* character */ number? ];
  unverifiedLine: number;
  unverifiedColumn?: number;
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
export interface ExceptionBreakpoint extends BreakpointBase {
  kind: 'exception';
}
export interface Logpoint extends LineBreakpointBase {
  kind: 'log';
  logMessage: string;
}

export interface BreakpointManager {
  getBreakpointById: (breakpointId: number) => Breakpoint | undefined;
  getBreakpointsByLine: (fileName: string, line_0base: number) => Breakpoint[];
  getAllBreakpoints: () => Breakpoint[];
  setBreakpoint: (breakpointData: BreakpointData) => Promise<Breakpoint>;
  setExceptionBreakpoint: (enable: boolean) => Promise<ExceptionBreakpoint>;
  setLineBreakpoint: (breakpointData: LineBreakpointData) => Promise<LineBreakpoint>;
  setLineBreakpoints: (breakpointDataList: LineBreakpointData[]) => Promise<LineBreakpoint[]>;
  removeBreakpointById: (breakpointId: number) => Promise<number>;
  removeBreakpointsByLine: (fileName: string, line_0base: number) => Promise<number[]>;
  removeBreakpointsByFile: (fileName: string) => Promise<number[]>;
}
