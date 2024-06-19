import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';
import { Time } from '../../tools/time.types';

export interface ExecResult {
  command: dbgp.ContinuationCommandName;
  runState: dbgp.RunState;
  reason: dbgp.StatusReason;
  elapsedTime: Time;
  stackFrame: dbgp.StackFrame;
}
export type ContinuationCommandExecutor = (command: dbgp.ContinuationCommandName) => Promise<ExecResult>;
