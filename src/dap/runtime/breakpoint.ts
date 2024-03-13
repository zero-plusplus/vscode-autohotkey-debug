import { Session } from '../../types/dbgp/session.types';
import { Breakpoint, BreakpointData, BreakpointManager, LineBreakpoint, LineBreakpointData } from '../../types/dap/runtime/breakpoint.types';
import { toDbgpFileName } from '../../dbgp/utils';
import { DbgpError } from '../../dbgp/error';

let breakpointId = 0;
export const createBreakpointId = (): number => {
  return breakpointId++;
};

export const createBreakpointManager = (session: Session): BreakpointManager => {
  const breakpointsByFile = new Map<string, Map<number, Breakpoint[]>>();
  return {
    getBreakpointById,
    getBreakpointsByLine,
    getAllBreakpoints,
    async setBreakpoint(breakpointData: BreakpointData): Promise<Breakpoint> {
      switch (breakpointData.kind) {
        case 'line': return setLineBreakpoint(breakpointData);
        default: break;
      }
      throw Error();
    },
    setLineBreakpoint,
    setLineBreakpoints,
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
  async function setLineBreakpoint(breakpointData: LineBreakpointData): Promise<LineBreakpoint> {
    try {
      const breakpoint = await session.setLineBreakpoint(breakpointData.fileName, breakpointData.line);
      return {
        id: createBreakpointId(),
        kind: breakpointData.kind,
        fileName: breakpointData.fileName,
        line: breakpoint.line,
        verified: true,
        state: breakpoint.state,
        temporary: breakpointData.temporary ?? false,
        unverifiedLine: breakpointData.line,
      };
    }
    catch (e: unknown) {
      if (e instanceof DbgpError) {
        return {
          id: -1,
          kind: breakpointData.kind,
          fileName: breakpointData.fileName,
          line: breakpointData.line,
          verified: false,
          state: 'disabled',
          temporary: breakpointData.temporary ?? false,
          unverifiedLine: breakpointData.line,
        };
      }
      throw e;
    }
  }
  async function setLineBreakpoints(breakpointDataList: LineBreakpointData[]): Promise<LineBreakpoint[]> {
    const breakpoints: LineBreakpoint[] = [];
    for await (const breakpointData of breakpointDataList) {
      breakpoints.push(await setLineBreakpoint(breakpointData));
    }
    return breakpoints;
  }
  async function removeBreakpointById(breakpointId: number): Promise<void> {
    return session.removeBreakpointById(breakpointId);
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
