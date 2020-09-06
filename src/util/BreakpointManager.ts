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
  public async registerBreakpoint(fileUriOrBreakpoint: string | dbgp.Breakpoint, line?: number, advancedData?: dbgp.BreakpointAdvancedData): Promise<dbgp.Breakpoint> {
    let _fileUri: string, _line: number, _advancedData: dbgp.BreakpointAdvancedData | undefined;
    if (fileUriOrBreakpoint instanceof dbgp.Breakpoint) {
      const breakpoint = fileUriOrBreakpoint;
      if (breakpoint.advancedData?.hide) {
        return fileUriOrBreakpoint;
      }
      _fileUri = breakpoint.fileUri;
      _line = breakpoint.line;
      _advancedData = breakpoint.advancedData;
    }
    else {
      _fileUri = fileUriOrBreakpoint;
      if (!line) {
        throw new TypeError('The second argument is not specified.');
      }
      _line = line;
      _advancedData = advancedData;

      if (this.hasBreakpoint(_fileUri, _line)) {
        const breakpoint = this.getBreakpoint(_fileUri, _line)!;
        if (breakpoint.advancedData?.hide) {
          return breakpoint;
        }
      }
    }
    const response = await this.session.sendBreakpointSetCommand(_fileUri, _line);
    const { breakpoint } = await this.session.sendBreakpointGetCommand(response.id);
    breakpoint.advancedData = _advancedData;
    this.breakpointsById.set(breakpoint.id, breakpoint);
    return breakpoint;
  }
  public async unregisterBreakpoint(idOrFileUriOrBreakpoint: number | string | dbgp.Breakpoint, line?: number): Promise<void> {
    let breakpoint: dbgp.Breakpoint;
    if (idOrFileUriOrBreakpoint instanceof dbgp.Breakpoint) {
      breakpoint = idOrFileUriOrBreakpoint;
    }
    else {
      const idOrFileUri = idOrFileUriOrBreakpoint;
      if (!this.hasBreakpoint(idOrFileUriOrBreakpoint, line)) {
        return;
      }
      breakpoint = this.getBreakpoint(idOrFileUri, line)!;
    }

    if (breakpoint.advancedData?.hide) {
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

    await Promise.all(breakpoints.map(async(breakpoint) => {
      if (breakpoint.advancedData?.hide) {
        return;
      }
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
