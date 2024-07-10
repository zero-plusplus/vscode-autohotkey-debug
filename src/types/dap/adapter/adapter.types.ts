export const messageCategories = [
  'stdout',
  'stderr',
  'console',
  'important',
] as const;
export type MessageCategory = typeof messageCategories[number];
export const stopReasons = [
  'entry',
  'step',
  'breakpoint',
  'hidden breakpoint',
  'pause',
  'exception',
  'error',
  'exit',
] as const;
export type StopReason = typeof stopReasons[number];
