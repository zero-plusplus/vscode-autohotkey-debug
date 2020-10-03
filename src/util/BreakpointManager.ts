import * as dbgp from '../dbgpSession';
import { URI } from 'vscode-uri';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';
import { equalsIgnoreCase } from './stringUtils';

export type BreakpointLogGroup = 'start' | 'startCollapsed' | 'end' | undefined;
export interface BreakpointAdvancedData {
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  logGroup?: BreakpointLogGroup;
  hidden?: boolean;
  hitCount: number;
  unverifiedLine?: number;
  unverifiedColumn?: number;
}
export type BreakpointKind = 'breakpoint' | 'logpoint' | 'conditional breakpoint' | 'conditional logpoint';
export class Breakpoint implements BreakpointAdvancedData {
  public id: number;
  public fileUri: string;
  public line: number;
  public condition: string;
  public hitCondition: string;
  public logMessage: string;
  public logGroup: BreakpointLogGroup;
  public hidden: boolean;
  public hitCount = 0;
  public unverifiedLine?: number;
  public unverifiedColumn?: number;
  public get filePath(): string {
    return URI.parse(this.fileUri).fsPath;
  }
  public get kind(): BreakpointKind {
    const logMode = Boolean(this.logMessage || this.logGroup);
    if (this.condition || this.hitCondition) {
      if (logMode) {
        return 'conditional logpoint';
      }
      return 'conditional breakpoint';
    }
    return logMode ? 'logpoint' : 'breakpoint';
  }
  constructor(dbgpBreakpoint: dbgp.Breakpoint, advancedData?: BreakpointAdvancedData) {
    this.id = dbgpBreakpoint.id;
    this.fileUri = dbgpBreakpoint.fileUri;
    this.line = dbgpBreakpoint.line;

    this.condition = advancedData?.condition ?? '';
    this.hitCondition = advancedData?.hitCondition ?? '';
    this.logMessage = advancedData?.logMessage ?? '';
    this.logGroup = advancedData?.logGroup;
    this.hidden = advancedData?.hidden ?? false;
    this.unverifiedLine = advancedData?.unverifiedLine;
    this.unverifiedColumn = advancedData?.unverifiedColumn;
  }
}
export class LineBreakpoints extends Array<Breakpoint> {
  public get fileUri(): string {
    return 0 < this.length ? this[0].fileUri : '';
  }
  public get filePath(): string {
    return 0 < this.length ? this[0].filePath : '';
  }
  public get line(): number {
    return 0 < this.length ? this[0].line : -1;
  }
  public incrementHitCount(): void {
    this.forEach((breakpoint) => {
      breakpoint.hitCount++;
    });
  }
  public decrementHitCount(): void {
    this.forEach((breakpoint) => {
      breakpoint.hitCount--;
    });
  }
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
  public getLineBreakpoints(fileUri: string, line: number): LineBreakpoints | null {
    const targetFilePath = URI.parse(fileUri).fsPath;

    for (const [ , lineBreakpoints ] of this.breakpointsMap) {
      if (!equalsIgnoreCase(targetFilePath, lineBreakpoints.filePath)) {
        continue;
      }
      if (line !== lineBreakpoints.line) {
        continue;
      }
      return lineBreakpoints;
    }
    return null;
  }
  public async registerBreakpoint(fileUriOrBreakpoint: string | Breakpoint, line: number, advancedData?: BreakpointAdvancedData): Promise<Breakpoint> {
    let fileUri: string, unverifiedLine: number, _advancedData: BreakpointAdvancedData | undefined;
    if (fileUriOrBreakpoint instanceof Breakpoint) {
      const breakpoint = fileUriOrBreakpoint;
      if (breakpoint.hidden) {
        return fileUriOrBreakpoint;
      }
      fileUri = breakpoint.fileUri;
      unverifiedLine = breakpoint.line;
      _advancedData = breakpoint as BreakpointAdvancedData;
    }
    else {
      fileUri = fileUriOrBreakpoint;
      if (!line) {
        throw new TypeError('The second argument is not specified.');
      }
      unverifiedLine = line;
      _advancedData = advancedData;
    }

    const response = await this.session.sendBreakpointSetCommand(fileUri, unverifiedLine);
    const settedBreakpoint = new Breakpoint((await this.session.sendBreakpointGetCommand(response.id)).breakpoint, _advancedData);
    const verifiedLine = settedBreakpoint.line;

    let registeredBreakpoints: LineBreakpoints;
    if (this.hasBreakpoint(fileUri, verifiedLine)) {
      registeredBreakpoints = this.getLineBreakpoints(fileUri, verifiedLine)!;
      if (settedBreakpoint.hidden) {
        registeredBreakpoints.push(settedBreakpoint);
      }
      else {
        registeredBreakpoints.unshift(settedBreakpoint);
      }
    }
    else {
      registeredBreakpoints = new LineBreakpoints(settedBreakpoint);
      const key = this.createKey(fileUri, verifiedLine);
      this.breakpointsMap.set(key, registeredBreakpoints);
    }
    return settedBreakpoint;
  }
  public async unregisterLineBreakpoints(fileUri: string, line: number): Promise<void> {
    const breakpoints = this.getLineBreakpoints(fileUri, line);
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
  public async unregisterBreakpointsInFile(fileUri: string): Promise<Breakpoint[]> {
    const targetFilePath = URI.parse(fileUri).fsPath;

    const removedBreakpoints: Breakpoint[] = [];
    for await (const [ , lineBreakpoints ] of this.breakpointsMap) {
      if (equalsIgnoreCase(targetFilePath, lineBreakpoints.filePath)) {
        await this.unregisterLineBreakpoints(fileUri, lineBreakpoints.line);
        removedBreakpoints.push(...lineBreakpoints.filter((breakpoint) => !breakpoint.hidden));
      }
    }
    return removedBreakpoints;
  }
  private createKey(fileUri: string, line: number): string {
    // The following encoding differences have been converted to path
    // file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk"
    // file:///w:/project/vscode-autohotkey-debug/demo/demo.ahk
    const filePath = URI.parse(fileUri).fsPath.toLowerCase();
    return `${filePath},${line}`;
  }
}
