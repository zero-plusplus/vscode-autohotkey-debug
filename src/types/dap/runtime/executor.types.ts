import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';
import { Time } from '../../tools/time.types';
import { StackFrame } from './context.types';

export interface ExecResult {
  command: dbgp.ContinuationCommandName;
  runState: dbgp.RunState;
  reason: dbgp.StatusReason;
  elapsedTime: Time;
  stackFrame?: StackFrame;
}
export type ContinuationCommandExecutor = (command: dbgp.ContinuationCommandName) => Promise<ExecResult>;
