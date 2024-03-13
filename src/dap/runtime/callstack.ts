import { CallStackManager, StackFrame } from '../../types/dap/runtime/callstack.types';
import { Session } from '../../types/dbgp/session.types';

export const createCallStackManager = (session: Session): CallStackManager => {
  let currentCallStackId = 0;
  const callStackById = new Map<number, StackFrame>();
  return {
    async getCallStack(): Promise<StackFrame[]> {
      return (await session.getCallStack()).map((callStack) => {
        const stackFrame: StackFrame = {
          id: currentCallStackId++,
          fileName: callStack.fileName,
          level: callStack.level,
          line: callStack.line,
          label: callStack.where,
        };

        callStackById.set(stackFrame.id, stackFrame);
        return stackFrame;
      });
    },
    getStackFrameById(id: number): StackFrame | undefined {
      return callStackById.get(id);
    },
  };
};
