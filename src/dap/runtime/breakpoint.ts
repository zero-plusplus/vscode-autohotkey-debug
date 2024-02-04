import * as dbgp from '../../types/dbgp/ExtendAutoHotkeyDebugger';
import { CommandSender } from '../../types/dap/session';
import { BreakpointData, BreakpointManager } from '../../types/dap/runtime/breakpoint';
import { toDbgpFileName, toFsPath } from '../../dbgp/utils';
import { DbgpError } from '../../dbgp/error';

let breakpointId = 0;
export const createBreakpointId = (): number => {
  return breakpointId++;
};

export const createBreakpointManager = (sendCommand: CommandSender): BreakpointManager => {
  const breakpointsByFile = new Map<dbgp.FileName, Map<number, dbgp.Breakpoint[]>>();
  return {
    getBreakpointById,
    getBreakpointsByLine,
    getAllBreakpoints,
    async setBreakpoint(breakpointData: BreakpointData): Promise<dbgp.Breakpoint> {
      switch (breakpointData.kind) {
        case 'line': return setLineBreakpoint(breakpointData.fileName, breakpointData.line);
        default: break;
      }
      throw Error();
    },
    removeBreakpointById,
    removeBreakpointsByLine,
    removeBreakpointsByFile,
  };

  function getAllBreakpoints(): dbgp.Breakpoint[] {
    const breakpoints: dbgp.Breakpoint[] = [];
    for (const [ , breakpointInFile ] of [ ...breakpointsByFile ]) {
      for (const [ , breakpointsByLine ] of [ ...breakpointInFile ]) {
        breakpoints.push(...breakpointsByLine);
      }
    }
    return breakpoints;
  }
  function getBreakpointById(breakpointId: number): dbgp.Breakpoint | undefined {
    return getAllBreakpoints().find((breakpoint) => breakpoint.id === breakpointId);
  }
  function getBreakpointsByLine(fileName: string, line_0base: number): dbgp.Breakpoint[] {
    const dbgpFileName = toDbgpFileName(fileName);
    if (!dbgpFileName) {
      return [];
    }
    return breakpointsByFile.get(dbgpFileName)?.get(line_0base) ?? [];
  }
  async function setLineBreakpoint(fileName: string, line: number, condition?: dbgp.Condition, temporary = false): Promise<dbgp.LineBreakpoint> {
    const type: dbgp.BreakpointType = 'line';
    const response = await sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', type, '-f', toDbgpFileName(fileName), '-r', temporary ]);
    if (response.error) {
      throw new DbgpError(Number(response.error.code));
    }
    const breakpoint: dbgp.LineBreakpoint = {
      id: createBreakpointId(),
      type,
      fileName: toFsPath(fileName),
      resolved: response.resolved,
      line,
      state: response.state === 'enabled',
      temporary,
    };
    return breakpoint;
  }
  async function removeBreakpointById(breakpointId: number): Promise<void> {
    const response = await sendCommand('breakpoint_remove', [ '-d', breakpointId ]);
    if (response.error) {
      throw new DbgpError(Number(response.error));
    }
  }
  async function removeBreakpointsByLine(fileName: string, line_0base: number): Promise<void> {
    const dbgpFileName = toDbgpFileName(fileName);
    if (!dbgpFileName) {
      return;
    }

    const breakpoints = breakpointsByFile.get(dbgpFileName)?.get(line_0base);
    if (!breakpoints) {
      return;
    }
    for await (const breakpoint of breakpoints) {
      await removeBreakpointById(breakpoint.id);
    }
  }
  async function removeBreakpointsByFile(fileName: string): Promise<void> {
    const dbgpFileName = toDbgpFileName(fileName);
    if (!dbgpFileName) {
      return;
    }

    const breakpointsInFile = breakpointsByFile.get(dbgpFileName);
    if (!breakpointsInFile) {
      return;
    }
    for await (const [ line ] of breakpointsInFile) {
      await removeBreakpointsByLine(dbgpFileName, line);
    }
  }
};
