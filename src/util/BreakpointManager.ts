import * as dbgp from '../dbgpSession';
import { URI } from 'vscode-uri';

export class BreakpointManager {
  private readonly session: dbgp.Session;
  private readonly breakpointsById = new Map<number, dbgp.Breakpoint>();
  constructor(session: dbgp.Session) {
    this.session = session;
  }
  public hasBreakpoint(idOrFileUri: string | number, line?: number): boolean {
    if (typeof idOrFileUri === 'number') {
      const id = idOrFileUri;
      return this.breakpointsById.has(id);
    }

    const fileUri = idOrFileUri;
    for (const [ , breakpoint ] of this.breakpointsById) {
      if (!this.equalsFileUri(fileUri, breakpoint.fileUri)) {
        continue;
      }
      if (line) {
        if (line !== breakpoint.line) {
          continue;
        }
      }

      return true;
    }
    return false;
  }
  public getBreakpointById(id: number): dbgp.Breakpoint | undefined {
    return this.breakpointsById.get(id);
  }
  public getBreakpoints(fileUri: string, line?: number): dbgp.Breakpoint[] {
    const breakpoints: dbgp.Breakpoint[] = [];

    for (const [ , breakpoint ] of this.breakpointsById) {
      if (!this.equalsFileUri(fileUri, breakpoint.fileUri)) {
        continue;
      }
      if (line) {
        if (line !== breakpoint.line) {
          continue;
        }
      }

      breakpoints.push(breakpoint);
    }

    return breakpoints;
  }
  public async registerBreakpoint(fileUriOrBreakpoint: string | dbgp.Breakpoint, line?: number, advancedData?: dbgp.BreakpointAdvancedData): Promise<dbgp.Breakpoint> {
    let fileUri: string, _line: number, _advancedData: dbgp.BreakpointAdvancedData | undefined;
    if (fileUriOrBreakpoint instanceof dbgp.Breakpoint) {
      const breakpoint = fileUriOrBreakpoint;
      fileUri = breakpoint.fileUri;
      _line = breakpoint.line;
      _advancedData = breakpoint.advancedData;
    }
    else {
      fileUri = fileUriOrBreakpoint;
      if (!line) {
        throw new TypeError('The second argument is not specified.');
      }
      _line = line;
      _advancedData = advancedData;
    }

    const response = await this.session.sendBreakpointSetCommand(fileUri, _line);
    const breakpoint = (await this.session.sendBreakpointGetCommand(response.id)).breakpoint;
    breakpoint.advancedData = _advancedData;
    this.breakpointsById.set(breakpoint.id, breakpoint);
    return breakpoint;
  }
  public async unregisterBreakpointById(id: number): Promise<void> {
    if (this.breakpointsById.has(id)) {
      await this.session.sendBreakpointRemoveCommand(id);
      this.breakpointsById.delete(id);
    }
  }
  public async unregisterBreakpoints(fileUri: string, line?: number): Promise<void> {
    const breakpoints = this.getBreakpoints(fileUri, line);
    await Promise.all(breakpoints.map(async(breakpoint) => {
      await this.unregisterBreakpointById(breakpoint.id);
    }));
  }
  private equalsFileUri(a, b): boolean {
    // Because the comparison may fail even if the file points to the same file, as shown below, the file path is unified
    // file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk"
    // file:///w:/project/vscode-autohotkey-debug/demo/demo.ahk
    const _a = URI.parse(a).fsPath.toLowerCase();
    const _b = URI.parse(b).fsPath.toLowerCase();
    return _a === _b;
  }
}
