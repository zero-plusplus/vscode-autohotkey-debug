import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { CommandSender } from '../../types/dbgp/session.types';
import { Breakpoint, BreakpointData, BreakpointManager, LineBreakpoint } from '../../types/dap/runtime/breakpoint.types';
import { toDbgpFileName, toFsPath } from '../../dbgp/utils';
import { DbgpError } from '../../dbgp/error';

let breakpointId = 0;
export const createBreakpointId = (): number => {
  return breakpointId++;
};

export const createBreakpointManager = (sendCommand: CommandSender): BreakpointManager => {
  const breakpointsByFile = new Map<string, Map<number, Breakpoint[]>>();
  return {
    getBreakpointById,
    getBreakpointsByLine,
    getAllBreakpoints,
    async setBreakpoint(breakpointData: BreakpointData): Promise<Breakpoint> {
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

  function getAllBreakpoints(): Breakpoint[] {
    const breakpoints: Breakpoint[] = [];
    for (const [ , breakpointInFile ] of [ ...breakpointsByFile ]) {
      for (const [ , breakpointsByLine ] of [ ...breakpointInFile ]) {
        breakpoints.push(...breakpointsByLine);
      }
    }
    return breakpoints;
  }
  function getBreakpointById(breakpointId: number): Breakpoint | undefined {
    return getAllBreakpoints().find((breakpoint) => breakpoint.id === breakpointId);
  }
  function getBreakpointsByLine(fileName: string, line_0base: number): Breakpoint[] {
    const dbgpFileName = toDbgpFileName(fileName);
    if (!dbgpFileName) {
      return [];
    }
    return breakpointsByFile.get(dbgpFileName)?.get(line_0base) ?? [];
  }
  async function setLineBreakpoint(fileName: string, line: number, condition?: string, temporary = false): Promise<LineBreakpoint> {
    const type: dbgp.BreakpointType = 'line';
    const response = await sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', type, '-f', toDbgpFileName(fileName), '-r', temporary ]);
    if (response.error) {
      throw new DbgpError(Number(response.error.attributes.code));
    }
    const breakpoint: LineBreakpoint = {
      id: createBreakpointId(),
      kind: type,
      fileName: toFsPath(fileName),
      verified: response.attributes.resolved,
      line,
      state: response.attributes.state,
      temporary,
      unverifiedLine: line,
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
