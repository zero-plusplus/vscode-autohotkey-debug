export const announceLevel = {
  Off: 0,
  Trace: 1,
  Debug: 2,
  Info: 3,
  Warning: 4,
  Error: 5,
} as const;
export type LogLevelName = keyof typeof announceLevel;
export type LogLevel = typeof announceLevel[LogLevelName];
export type LogCategory = 'stdout' | 'stderr' | 'console' | 'important' | (string & { ThisIsLiteralUnionTrick: any });
export const outputCategories = {
  stdout: 'stdout',             // Output in blue text
  stderr: 'stderr',             // Output in red text
  console: 'console',           // Output in yellow text
} as const;
export const outputDestination = {
  Trace: outputCategories.console,
  Debug: outputCategories.console,
  Info: outputCategories.stdout,
  Warn: outputCategories.stdout,
  Error: outputCategories.stderr,
} as const;

export interface LogMessage {
  timestamp: Date;
  message: string;
}

export interface Logger {
  log: (message: LogMessage, level: LogLevel) => void;
}
