import * as dbgp from '../dbgpSession';
import { URI } from 'vscode-uri';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';

export type BreakpointLogGroup = 'start' | 'startCollapsed' | 'end' | undefined;
export interface BreakpointAdvancedData {
  counter: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  logLevel?: string;
  logGroup?: BreakpointLogGroup;
  hidden?: boolean;
}
export class Breakpoint {
  public id: number;
  public fileUri: string;
  public line: number;
  public advancedData?: BreakpointAdvancedData;
  constructor(dbgpBreakpoint: dbgp.Breakpoint, advancedData?: BreakpointAdvancedData) {
    this.id = dbgpBreakpoint.id;
    this.fileUri = dbgpBreakpoint.fileUri;
    this.line = dbgpBreakpoint.line;
    this.advancedData = advancedData;
  }
}

export class BreakpointManager {
  private readonly session: dbgp.Session;
  private readonly breakpointsMap = new CaseInsensitiveMap<string, Breakpoint[]>();
  constructor(session: dbgp.Session) {
    this.session = session;
  }
  public isAdvancedBreakpoint(fileUri: string, line: number): boolean {
    const breakpoints = this.getBreakpoints(fileUri, line);
    if (!breakpoints) {
      return false;
    }

    for (const breakpoint of breakpoints) {
      const advancedData = breakpoint?.advancedData;
      if (!advancedData) {
        continue;
      }

      const { condition, hitCondition, logMessage, logGroup } = advancedData;
      if (condition || hitCondition || logMessage || logGroup) {
        return true;
      }
    }
    return false;
  }
  public hasBreakpoint(fileUri: string, line: number): boolean {
    const key = this.createKey(fileUri, line);
    return this.breakpointsMap.has(key);
  }
  public getBreakpoints(fileUri: string, line: number): Breakpoint[] | null {
    const targetFilePath = URI.parse(fileUri).fsPath.toLowerCase();

    for (const [ key, breakpoints ] of this.breakpointsMap) {
      const temp = key.split(',');
      const filePath = temp[0];
      const _line = parseInt(temp[1], 10);
      if (targetFilePath !== filePath) {
        continue;
      }
      if (line !== _line) {
        continue;
      }
      return breakpoints;
    }
    return null;
  }
  public async registerBreakpoint(fileUriOrBreakpoint: string | Breakpoint, line?: number, advancedData?: BreakpointAdvancedData): Promise<Breakpoint> {
    let _fileUri: string, _line: number, _advancedData: BreakpointAdvancedData | undefined;
    if (fileUriOrBreakpoint instanceof Breakpoint) {
      const breakpoint = fileUriOrBreakpoint;
      if (breakpoint.advancedData?.hidden) {
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
    }

    const response = await this.session.sendBreakpointSetCommand(_fileUri, _line);
    const settedBreakpoint = new Breakpoint((await this.session.sendBreakpointGetCommand(response.id)).breakpoint, _advancedData);
    const actualLine = settedBreakpoint.line;

    let registeredBreakpoints: Breakpoint[];
    if (this.hasBreakpoint(_fileUri, actualLine)) {
      registeredBreakpoints = this.getBreakpoints(_fileUri, actualLine)!;
      registeredBreakpoints.push(settedBreakpoint);
    }
    else {
      registeredBreakpoints = [ settedBreakpoint ];
      const key = this.createKey(_fileUri, actualLine);
      this.breakpointsMap.set(key, registeredBreakpoints);
    }
    return settedBreakpoint;
  }
  public async unregisterBreakpoints(fileUri: string, line: number): Promise<void> {
    const breakpoints = this.getBreakpoints(fileUri, line);
    if (!breakpoints || breakpoints.length === 0) {
      return;
    }

    const id = breakpoints[0].id;
    const key = this.createKey(fileUri, line);
    const hiddenBreakpoints = breakpoints.filter((breakpoint) => breakpoint.advancedData?.hidden ?? false);
    if (hiddenBreakpoints.length === 0 && this.breakpointsMap.has(key)) {
      try {
        await this.session.sendBreakpointRemoveCommand(id);
        this.breakpointsMap.delete(key);
      }
      catch {
      }
    }
    else {
      this.breakpointsMap.set(key, hiddenBreakpoints);
    }
  }
  public async unregisterBreakpointsInFile(fileUri: string): Promise<void> {
    const targetFilePath = URI.parse(fileUri).fsPath.toLowerCase();

    await Promise.all(Array.from(this.breakpointsMap.entries()).map(async([ key, breakpoints ]) => {
      const temp = key.split(',');
      const filePath = temp[0];
      const line = parseInt(temp[1], 10);

      if (targetFilePath !== filePath) {
        return;
      }

      await this.unregisterBreakpoints(fileUri, line);
    }));
  }
  private createKey(fileUri: string, line: number): string {
    // The following encoding differences have been converted to path
    // file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk"
    // file:///w:/project/vscode-autohotkey-debug/demo/demo.ahk
    const filePath = URI.parse(fileUri).fsPath;
    return `${filePath},${line}`;
  }
}
