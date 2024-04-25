export type MessageCategory = 'stdout' | 'stderr' | 'console' | 'important';
export type StopReason =
  | 'entry'
  | 'step'
  | 'breakpoint'
  | 'hidden breakpoint'
  | 'pause'
  | 'exception'
  | 'error'
  | 'exit';
