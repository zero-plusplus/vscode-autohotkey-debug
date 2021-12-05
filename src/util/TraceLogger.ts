import { Logger, logger } from 'vscode-debugadapter';
import { now } from './util';

export class TraceLogger {
  public enable = false;
  constructor(logCallback: (e) => void) {
    logger.init(logCallback);
    logger.setup(Logger.LogLevel.Log);
  }
  public log(message: string): void {
    if (this.enable) {
      logger.log(`${now()} Trace ${message}`);
    }
  }
}
