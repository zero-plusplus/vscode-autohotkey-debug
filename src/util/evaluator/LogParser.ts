export const groupLogPrefixes = [
  'startCollapsed',
  'start',
  'end',
] as const;
export const categoryLogPrefixes = [
  'info',
  'error',
  'nortice',
] as const;

export const actionLogPrefixes = [
  'break',
  'clear',
] as const;
export const logPrefixes = [
  ...groupLogPrefixes,
  ...categoryLogPrefixes,
  ...actionLogPrefixes,
] as const;
export type LogPrefix = GroupLogPrefix | CategoryLogPrefix | ActionLogPrefix;
export type GroupLogPrefix = typeof groupLogPrefixes[number];
export type CategoryLogPrefix = typeof categoryLogPrefixes[number];
export type ActionLogPrefix = typeof actionLogPrefixes[number];

export type LogPrefixData = CategoryLogPrefixData | GroupLogPrefixData | ActionLogPrefixData;
export interface GroupLogPrefixData {
  type: 'group';
  value: GroupLogPrefix;
}
export interface CategoryLogPrefixData {
  type: 'category';
  value: CategoryLogPrefix;
}
export interface ActionLogPrefixData {
  type: 'action';
  value: ActionLogPrefix;
}

export interface ParsedLogData {
  prefixes: LogPrefixData[];
  message: string;
}

export const logPrefixeRegExp = new RegExp(`${logPrefixes.map((prefix) => `\\{:${prefix}:\\}`).join('|')}`, 'gui');
export const logPrefixesRegExp = new RegExp(`(${logPrefixeRegExp.source})+`, 'gui');
export class LogParser {
  public parse(text: string): ParsedLogData[] {
    const logPrefixRegExp = new RegExp(`${logPrefixes.map((prefix) => `\\{:${prefix}:\\}`).join('|')}`, 'gui');
    const logPrefixesRegExp = new RegExp(`(${logPrefixRegExp.source})+`, 'gui');

    const prefixesMatches = [ ...text.matchAll(logPrefixesRegExp) ];
    return this.splitLogText(text, prefixesMatches);
  }
  private splitLogText(text: string, matches: RegExpMatchArray[]): ParsedLogData[] {
    if (matches.length === 0) {
      return [ { prefixes: [], message: text } ];
    }

    let currentIndex = 0;
    let prefixes: LogPrefixData[] = [];
    const splited: ParsedLogData[] = [ ];
    for (const match of matches) {
      if (match.index !== undefined) {
        const message = text.slice(currentIndex, match.index);
        if (message !== '') {
          splited.push({
            prefixes,
            message,
          });
          currentIndex += message.length;
        }

        const nextIndex = match.index + match[0].length;
        const rawPrefixes = text.slice(currentIndex, nextIndex);
        prefixes = this.normalizePrefixes(rawPrefixes) ?? [];

        currentIndex = nextIndex;
        continue;
      }

      break;
    }

    splited.push({
      prefixes,
      message: text.slice(currentIndex),
    });
    return splited;
  }
  private normalizePrefixes(rawPrefixes: string | undefined): LogPrefixData[] | undefined {
    if (!rawPrefixes) {
      return undefined;
    }

    return [ ...rawPrefixes.matchAll(new RegExp(`\\{:(${logPrefixes.join('|')}):\\}`, 'gui')) ].map((match) => {
      const prefix = match[0]
        .slice(2, -2) // {:Break:} -> break
        .toLowerCase();

      switch (prefix) {
        case '>>': return 'startCollapsed';
        case '>': return 'start';
        case '<': return 'end';
        case 'startcollapsed': return 'startCollapsed';
        default: return prefix as LogPrefix;
      }
    }).map((prefix) => this.createPrefixData(prefix));
  }
  private createPrefixData(prefix: LogPrefix): LogPrefixData {
    if (groupLogPrefixes.some((groupPrefix) => groupPrefix === prefix)) {
      return {
        type: 'group',
        value: prefix as GroupLogPrefix,
      };
    }
    if (categoryLogPrefixes.some((categoryPrefix) => categoryPrefix === prefix)) {
      return {
        type: 'category',
        value: prefix as CategoryLogPrefix,
      };
    }
    return {
      type: 'action',
      value: prefix as ActionLogPrefix,
    };
  }
}
