import { Logger, logger } from 'vscode-debugadapter';

export class TraceLogger {
  public enable = false;
  constructor(logCallback: (e) => void) {
    logger.init(logCallback);
    logger.setup(Logger.LogLevel.Log);
  }
  public log(message: string): void {
    if (this.enable) {
      const now = new Date();
      const month = String(now.getMonth()).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliSeconds = String(now.getMilliseconds()).padStart(3, '0');
      logger.log(`${now.getFullYear()}-${month}-${date} ${hours}:${minutes}:${seconds}.${milliSeconds} Trace ${message}`);
    }
  }
}
