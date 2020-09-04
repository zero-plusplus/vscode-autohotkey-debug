import * as dbgp from '../dbgpSession';
import { URI } from 'vscode-uri';

export class BreakpointManager {
  private readonly session: dbgp.Session;
  private readonly breakpointsById = new Map<number, dbgp.Breakpoint>();
  constructor(session: dbgp.Session) {
    this.session = session;
  }
  public hasBreakpoint(idOrFileUri: string | number, line?: number): boolean {
    return Boolean(this.getBreakpoint(idOrFileUri, line));
  }
  public getBreakpoint(idOrfileUri: number | string, line?: number): dbgp.Breakpoint | null {
    if (typeof idOrfileUri === 'number') {
      const id = idOrfileUri;
      if (this.breakpointsById.has(id)) {
        return this.breakpointsById.get(id)!;
      }
      return null;
    }

    if (!line) {
      throw new TypeError('The second argument is not specified.');
    }

    const fileUri = idOrfileUri;
    for (const [ , breakpoint ] of this.breakpointsById) {
      if (this.equalsFileUri(fileUri, breakpoint.fileUri) && line === breakpoint.line) {
        return breakpoint;
      }
    }
    return null;
  }
  public getBreakpoints(fileUri: string): dbgp.Breakpoint[] {
    const breakpoints: dbgp.Breakpoint[] = [];

    for (const [ , breakpoint ] of this.breakpointsById) {
      if (this.equalsFileUri(fileUri, breakpoint.fileUri)) {
        breakpoints.push(breakpoint);
      }
    }

    return breakpoints;
  }
  public async registerBreakpoint(fileUri: string, line: number, advancedData?: dbgp.BreakpointAdvancedData): Promise<dbgp.Breakpoint> {
    const response = await this.session.sendBreakpointSetCommand(fileUri, line);
    const { breakpoint } = await this.session.sendBreakpointGetCommand(response.id);
    breakpoint.advancedData = advancedData;
    this.breakpointsById.set(breakpoint.id, breakpoint);
    return breakpoint;
  }
  public async unregisterBreakpoint(idOrFileUriOrBreakpoint: number | string | dbgp.Breakpoint, line?: number): Promise<void> {
    let breakpoint: dbgp.Breakpoint;
    if (typeof idOrFileUriOrBreakpoint === 'number') {
      const id = idOrFileUriOrBreakpoint;
      if (!this.breakpointsById.has(id)) {
        return;
      }
      breakpoint = this.breakpointsById.get(id)!;
    }
    else if (idOrFileUriOrBreakpoint instanceof dbgp.Breakpoint) {
      breakpoint = idOrFileUriOrBreakpoint;
    }
    else {
      const fileUri = idOrFileUriOrBreakpoint;
      if (!line) {
        throw new TypeError('The second argument is not specified.');
      }

      if (!this.hasBreakpoint(fileUri, line)) {
        return;
      }
      breakpoint = this.getBreakpoint(fileUri, line)!;
    }

    if (breakpoint.advancedData?.readonly) {
      return;
    }

    try {
      await this.session.sendBreakpointRemoveCommand(breakpoint.id);
      this.breakpointsById.delete(breakpoint.id);
    }
    catch {
    }
  }
  public async unregisterBreakpoints(fileUri: string): Promise<void> {
    const breakpoints = this.getBreakpoints(fileUri);

    await Promise.all(breakpoints.filter((breakpoint) => breakpoint.advancedData?.readonly === false).map(async(breakpoint) => {
      await this.unregisterBreakpoint(breakpoint);
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
