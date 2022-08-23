import * as dbgp from '../dbgpSession';
import { URI } from 'vscode-uri';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';
import { equalsIgnoreCase } from './stringUtils';
import { toFileUri } from './util';

export type BreakpointLogGroup = 'start' | 'startCollapsed' | 'end' | undefined;
export interface BreakpointAdvancedData {
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  logGroup?: BreakpointLogGroup;
  shouldBreak: boolean;
  hidden?: boolean;
  hitCount: number;
  unverifiedLine?: number;
  unverifiedColumn?: number;
  action?: () => Promise<void>;
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
  public shouldBreak: boolean;
  public unverifiedLine?: number;
  public unverifiedColumn?: number;
  public action?: () => Promise<void>;
  public get filePath(): string {
    return URI.parse(this.fileUri).fsPath;
  }
  public get hasCondition(): boolean {
    return Boolean(this.condition || this.hitCondition);
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
    this.unverifiedLine = advancedData?.unverifiedLine ?? dbgpBreakpoint.line;
    this.unverifiedColumn = advancedData?.unverifiedColumn;
    this.action = advancedData?.action;

    this.shouldBreak = !(this.logMessage || this.action);
    if (advancedData?.shouldBreak) {
      this.shouldBreak = advancedData.shouldBreak;
    }
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
      const { condition, hitCondition, logMessage, logGroup, action } = breakpoint;
      if (condition || hitCondition || logMessage || logGroup || action) {
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
    const key = this.createKey(fileUri, line);
    for (const [ targetKey, lineBreakpoints ] of this.breakpointsMap) {
      if (equalsIgnoreCase(key, targetKey)) {
        return lineBreakpoints;
      }
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

    let registeredLineBreakpoints: LineBreakpoints;
    if (this.hasBreakpoint(fileUri, verifiedLine)) {
      registeredLineBreakpoints = this.getLineBreakpoints(fileUri, verifiedLine)!;
      registeredLineBreakpoints.push(settedBreakpoint);
      registeredLineBreakpoints.sort((a, b) => {
        if (a.hidden !== b.hidden) {
          return Number(a.hidden) - Number(b.hidden);
        }
        if (a.unverifiedColumn && b.unverifiedColumn) {
          return a.unverifiedColumn - b.unverifiedColumn;
        }
        const lineA = a.unverifiedLine ?? a.line;
        const lineB = b.unverifiedLine ?? b.line;
        return lineA - lineB;
      });
    }
    else {
      registeredLineBreakpoints = new LineBreakpoints(settedBreakpoint);
      const key = this.createKey(fileUri, verifiedLine);
      this.breakpointsMap.set(key, registeredLineBreakpoints);
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
    const targetFilePath = URI.parse(toFileUri(fileUri)).fsPath;

    const removedBreakpoints: Breakpoint[] = [];
    for await (const [ , lineBreakpoints ] of this.breakpointsMap) {
      if (equalsIgnoreCase(targetFilePath, lineBreakpoints.filePath)) {
        await this.unregisterLineBreakpoints(fileUri, lineBreakpoints.line);
        removedBreakpoints.push(...lineBreakpoints.filter((breakpoint) => !breakpoint.hidden));
      }
    }
    return removedBreakpoints;
  }
  private createKey(file: string, line: number): string {
    // The following encoding differences have been converted to path
    // file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk"
    // file:///w:/project/vscode-autohotkey-debug/demo/demo.ahk

    const fileUri = toFileUri(file);
    return `${fileUri},${line}`;
  }
}
