export interface StackFrame {
  id: number;
  label: string;
  level: number;
  fileName: string;
  line: number;
}

export interface CallStackManager {
  getCallStack: () => Promise<StackFrame[]>;
  getStackFrameById: (id: number) => StackFrame | undefined;
}
