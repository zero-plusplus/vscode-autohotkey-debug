import { DebugProtocol } from '@vscode/debugprotocol';

export interface PerfTipsEvent extends DebugProtocol.Event {
  event: 'perfTips';
  body: {
    reason: 'new' | 'removed';
    fileName: string;
    line: number;
    content: string;
    css?: {
      fontStyle?: string;
      color?: string;
      backgroundColor?: string;
      border?: string;
      borderColor?: string;
      fontWeight?: string;
      height?: string;
      margin?: string;
      textDecoration?: string;
      width?: string;
    };
  };
}
export interface ClearConsoleEvent extends DebugProtocol.Event {
  event: 'clearConsole';
  body: {
    /**
     * Message output after console clear.
     */
    message: string;
    category: 'stdout' | 'stderr' | 'console';
  };
}
export interface NotificationEvent extends DebugProtocol.Event {
  event: 'notification';
  body: {
    type: 'information' | 'warning' | 'error';
    message: string;
    detail?: string;
    modal?: boolean;
  };
}

export interface Position {
  line: number;
  character: number;
}
export interface Range {
  start: Position;
  end: Position;
}
export interface FileOpenEvent extends DebugProtocol.Event {
  event: 'fileOpen';
  body: {
    fileName: string;
    selectedRange?: Range;
  };
}

