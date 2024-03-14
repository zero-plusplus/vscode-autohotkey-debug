import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';
import { ExecResult } from '../../dbgp/session.types';

export type ContinuationCommandExecutor = (command: dbgp.ContinuationCommandName) => Promise<ExecResult>;
