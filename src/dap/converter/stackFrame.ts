import * as path from 'path';
import { StackFrame } from '../../types/dap/runtime/context.types';
import { DapStackFrame } from '../../types/dap/types';
import { FrameIdManager } from '../../types/dap/adapter/utils.types';

export function callstackToStackFrames(framdIdManager: FrameIdManager, stackFrames: StackFrame[]): DapStackFrame[] {
  return stackFrames.map((stackFrame) => convertStackFrame(framdIdManager, stackFrame));
}
export function convertStackFrame(framdIdManager: FrameIdManager, stackFrame: StackFrame): DapStackFrame {
  const dapStackFrame: DapStackFrame = {
    id: framdIdManager.createFrameId(),
    level: stackFrame.level,
    line: stackFrame.line,
    column: 0,
    name: stackFrame.where,
    source: {
      name: path.basename(stackFrame.fileName, path.extname(stackFrame.fileName)),
      path: stackFrame.fileName,
    },
  };
  return dapStackFrame;
}
