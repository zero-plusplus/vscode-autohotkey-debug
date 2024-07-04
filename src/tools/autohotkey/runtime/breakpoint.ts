import { Session } from '../../../types/dbgp/session.types';
import { Breakpoint, BreakpointData, BreakpointManager, BreakpointWithLine, ExceptionBreakpoint, LineBreakpoint, LineBreakpointData } from '../../../types/tools/autohotkey/runtime/breakpoint.types';
import { toDbgpFileName } from '../../../dbgp/utils';
import { DbgpError } from '../../../dbgp/error';

export const createBreakpointManager = (session: Session): BreakpointManager => {
  const $breakpointsById = new Map<number, Breakpoint>();
  return {
    getBreakpointById: (breakpointId: number) => $breakpointsById.get(breakpointId),
    getBreakpointsByLine,
    getAllBreakpoints,
    setBreakpoint: async(breakpointData: BreakpointData): Promise<Breakpoint> => registerBreakpoints(await setBreakpoint(session, breakpointData)),
    setLineBreakpoint: async(breakpointData: LineBreakpointData): Promise<LineBreakpoint> => registerBreakpoints(await setLineBreakpoint(session, breakpointData)),
    setLineBreakpoints: async(breakpointDataList: LineBreakpointData[]): Promise<LineBreakpoint[]> => registerBreakpoints(await setLineBreakpoints(session, breakpointDataList)),
    setExceptionBreakpoint: async(enable: boolean) => registerBreakpoints(await setExceptionBreakpoint(session, enable)),
    removeBreakpointById: async(breakpointId: number) => unregisterBreakpoints(await removeBreakpointById(session, breakpointId)),
    removeBreakpointsByLine,
    removeBreakpointsByFile,
  };

  function registerBreakpoints<T extends Breakpoint | Breakpoint[]>(breakpointOrBrekpoints: T): T {
    const breakpoints: Breakpoint[] = Array.isArray(breakpointOrBrekpoints) ? breakpointOrBrekpoints : [ breakpointOrBrekpoints ];
    for (const breakpoint of breakpoints) {
      $breakpointsById.set(breakpoint.id, breakpoint);
    }
    return breakpointOrBrekpoints;
  }
  function unregisterBreakpoints<T extends number | number[]>(breakpointIdOrList: T): T {
    const breakpointIdList: number[] = Array.isArray(breakpointIdOrList) ? breakpointIdOrList : [ breakpointIdOrList ];
    for (const breakpointId of breakpointIdList) {
      $breakpointsById.delete(breakpointId);
    }
    return breakpointIdOrList;
  }
  function getAllBreakpoints(): Breakpoint[] {
    return [ ...$breakpointsById.entries() ].map(([ , breakpoint ]) => {
      return breakpoint;
    });
  }
  function getBreakpointsByFile(fileName: string): BreakpointWithLine[] {
    return getAllBreakpoints().filter((breakpoint): breakpoint is BreakpointWithLine => {
      if (!('fileName' in breakpoint)) {
        return false;
      }
      if (breakpoint.fileName.toLowerCase() !== fileName.toLowerCase()) {
        return false;
      }
      return true;
    });
  }
  function getBreakpointsByLine(fileName: string, line_0base: number): BreakpointWithLine[] {
    return getAllBreakpoints().filter((breakpoint): breakpoint is BreakpointWithLine => {
      if (!('fileName' in breakpoint)) {
        return false;
      }
      if (breakpoint.fileName.toLowerCase() !== fileName.toLowerCase()) {
        return false;
      }
      if (breakpoint.line !== line_0base) {
        return false;
      }
      return true;
    });
  }
  async function removeBreakpointsByLine(fileName: string, line_0base: number): Promise<number[]> {
    const targetBreakpoints = getBreakpointsByLine(fileName, line_0base);
    return unregisterBreakpoints(await removeBreakpoints(session, targetBreakpoints));
  }
  async function removeBreakpointsByFile(fileName: string): Promise<number[]> {
    const targetBreakpoints = getBreakpointsByFile(fileName);
    return unregisterBreakpoints(await removeBreakpoints(session, targetBreakpoints));
  }
};

// #region wrapped [7.6.1 breakpoint_set](https://xdebug.org/docs/dbgp#id3)
export async function setBreakpoint(session: Session, breakpointData: BreakpointData): Promise<Breakpoint> {
  switch (breakpointData.kind) {
    case 'line': return setLineBreakpoint(session, breakpointData);
    default: break;
  }
  throw Error();
}
export async function setLineBreakpoint(session: Session, breakpointData: LineBreakpointData): Promise<LineBreakpoint> {
  try {
    const { attributes: { id, resolved, state } } = await session.sendBreakpointSetCommand({ type: 'line', fileName: toDbgpFileName(breakpointData.fileName), line: breakpointData.line });
    const breakpointId = Number(id);
    const { breakpoint: { attributes: { lineno } } } = await session.sendBreakpointGetCommand(breakpointId);
    return {
      id: breakpointId,
      kind: breakpointData.kind,
      fileName: breakpointData.fileName,
      line: Number(lineno),
      verified: resolved,
      state,
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
export async function setLineBreakpoints(session: Session, breakpointDataList: LineBreakpointData[]): Promise<LineBreakpoint[]> {
  const breakpoints: LineBreakpoint[] = [];
  for await (const breakpointData of breakpointDataList) {
    breakpoints.push(await setLineBreakpoint(session, breakpointData));
  }
  return breakpoints;
}
export async function setExceptionBreakpoint(session: Session, state: boolean): Promise<ExceptionBreakpoint> {
  const response = await session.sendBreakpointSetCommand({ type: 'exception', state: state ? 'enabled' : 'disabled' });
  const id = Number(response.attributes.id);
  const { breakpoint: { attributes: breakpoint } } = await session.sendBreakpointGetCommand(id);

  const exceptionBreakpoint: ExceptionBreakpoint = {
    id,
    kind: 'exception',
    state: breakpoint.state,
    temporary: false,
  };
  return exceptionBreakpoint;
}
// #endregion wrapped [7.6.1 breakpoint_set](https://xdebug.org/docs/dbgp#id3)

// #region custom
export async function removeBreakpointById(session: Session, breakpointId: number): Promise<number> {
  await session.sendBreakpointRemoveCommand(breakpointId);
  return breakpointId;
}
export async function removeBreakpointsByIdList(session: Session, breakpointIdList: number[]): Promise<number[]> {
  for await (const breakpointId of breakpointIdList) {
    await session.sendBreakpointRemoveCommand(breakpointId);
  }
  return breakpointIdList;
}
export async function removeBreakpoint(session: Session, breakpoint: Breakpoint): Promise<number> {
  await removeBreakpointById(session, breakpoint.id);
  return breakpoint.id;
}
export async function removeBreakpoints(session: Session, breakpoints: Breakpoint[]): Promise<number[]> {
  const breakpointIdList = breakpoints.map((breakpoint) => breakpoint.id);
  return removeBreakpointsByIdList(session, breakpointIdList);
}
// #endregion custom
