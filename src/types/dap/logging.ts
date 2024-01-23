export const announceLevel = {
  NONE: 0,
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  NOTICE: 4,
  WARN: 5,
  ERROR: 6,
  CRITICAL: 7,
} as const;
export type LogLevelName = keyof typeof announceLevel;
export type LogLevel = typeof announceLevel[LogLevelName];
export type LogCategory = 'stdout' | 'stderr' | 'console' | 'important' | (string & { ThisIsLiteralUnionTrick: any });
export const outputCategories = {
  stdout: 'stdout',             // Output in blue text
  stderr: 'stderr',             // Output in red text
  console: 'console',           // Output in yellow text
  important: 'important',       // Output in blue text and show [notifications](https://code.visualstudio.com/api/ux-guidelines/notifications#notification-examples)
} as const;
export const outputDestination = {
  TRACE: outputCategories.console,
  DEBUG: outputCategories.console,
  INFO: outputCategories.stdout,
  NOTICE: outputCategories.stdout,
  WARN: outputCategories.stdout,
  ERROR: outputCategories.stderr,
  CRITICAL: outputCategories.stderr,
} as const;

export interface LogMessage {
  timestamp: Date;
  message: string;
}

export interface Logger {
  log: (message: LogMessage, level: LogLevel) => void;
}
