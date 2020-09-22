import * as dbgp from '../dbgpSession';
import { URI } from 'vscode-uri';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';

export type BreakpointLogGroup = 'start' | 'startCollapsed' | 'end' | undefined;
export interface BreakpointAdvancedData {
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  logGroup?: BreakpointLogGroup;
  hidden?: boolean;
}
export class Breakpoint {
  public id: number;
  public fileUri: string;
  public line: number;
  public condition: string;
  public hitCondition: string;
  public logMessage: string;
  public logGroup: string;
  public hidden: boolean;
  constructor(dbgpBreakpoint: dbgp.Breakpoint, advancedData?: BreakpointAdvancedData) {
    this.id = dbgpBreakpoint.id;
    this.fileUri = dbgpBreakpoint.fileUri;
    this.line = dbgpBreakpoint.line;

    this.condition = advancedData?.condition ?? '';
    this.hitCondition = advancedData?.hitCondition ?? '';
    this.logMessage = advancedData?.logMessage ?? '';
    this.logGroup = advancedData?.logGroup ?? '';
    this.hidden = advancedData?.hidden ?? false;
  }
}
export class LineBreakpoints extends Array<Breakpoint> {
  public hitCount = 0;
  public hasAdvancedBreakpoint(): boolean {
    for (const breakpoint of this) {
      const { condition, hitCondition, logMessage, logGroup } = breakpoint;
      if (condition || hitCondition || logMessage || logGroup) {
        return true;
      }
    }
    return false;
  }
}

export class BreakpointManager {
  private readonly session: dbgp.Session;
  private readonly breakpointsMap = new CaseInsensitiveMap<string, LineBreakpoints>();
  constructor(session: dbgp.Session) {
    this.session = session;
  }
  public hasBreakpoint(fileUri: string, line: number): boolean {
    const key = this.createKey(fileUri, line);
    return this.breakpointsMap.has(key);
  }
  public getBreakpoints(fileUri: string, line: number): LineBreakpoints | null {
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
      if (breakpoint.hidden) {
        return fileUriOrBreakpoint;
      }
      _fileUri = breakpoint.fileUri;
      _line = breakpoint.line;
      _advancedData = breakpoint as BreakpointAdvancedData;
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

    let registeredBreakpoints: LineBreakpoints;
    if (this.hasBreakpoint(_fileUri, actualLine)) {
      registeredBreakpoints = this.getBreakpoints(_fileUri, actualLine)!;
      if (settedBreakpoint.hidden) {
        registeredBreakpoints.push(settedBreakpoint);
      }
      else {
        registeredBreakpoints.unshift(settedBreakpoint);
      }
    }
    else {
      registeredBreakpoints = new LineBreakpoints(settedBreakpoint);
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
    const hiddenBreakpoints = breakpoints.filter((breakpoint) => breakpoint.hidden);
    if (hiddenBreakpoints.length === 0 && this.breakpointsMap.has(key)) {
      try {
        await this.session.sendBreakpointRemoveCommand(id);
        this.breakpointsMap.delete(key);
      }
      catch {
      }
    }
    else {
      this.breakpointsMap.set(key, new LineBreakpoints(...hiddenBreakpoints));
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
    const filePath = URI.parse(fileUri).fsPath.toLowerCase();
    return `${filePath},${line}`;
  }
}
