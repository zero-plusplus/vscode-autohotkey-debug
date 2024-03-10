import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { LineBreakpoint, LineBreakpointData } from '../../../types/dap/runtime/breakpoint.types';

export const setBreakPointsRequest = async <R extends DebugProtocol.SetBreakpointsResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.SetBreakpointsArguments): Promise<R> => {
  if (!args.source.path) {
    return response;
  }
  if (!args.breakpoints) {
    return response;
  }

  const fileName = args.source.path;
  const breakpointData = toLineBreakpointDataList(args.breakpoints);
  const lineBreakpoints = (await adapter.runtime.setLineBreakpoints(breakpointData));
  response.body = {
    breakpoints: toDapBreakpoints(lineBreakpoints),
  };
  return response;

  // #region utils
  function toLineBreakpointDataList(breakpoints: NonNullable<DebugProtocol.SetBreakpointsArguments['breakpoints']>): LineBreakpointData[] {
    return breakpoints.map((breakpoint) => {
      return {
        kind: 'line',
        fileName,
        hidden: false,
        line: breakpoint.line,
        character: breakpoint.column,
        condition: breakpoint.condition,
        hitCondition: breakpoint.hitCondition,
        logMessage: breakpoint.logMessage,
        temporary: false,
      };
    });
  }
  function toDapBreakpoints(breakpoints: LineBreakpoint[]): DebugProtocol.Breakpoint[] {
    return breakpoints.map((breakpoint) => {
      return {
        id: breakpoint.id,
        verified: breakpoint.verified,
        source: {
          path: breakpoint.fileName,
        },
        line: breakpoint.line,
      };
    });
  }
  // #endregion utils
};
