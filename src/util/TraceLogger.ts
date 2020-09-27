import { Logger, logger } from 'vscode-debugadapter';
import { pad } from 'underscore.string';

export class TraceLogger {
  public enable = false;
  constructor(logCallback: (e) => void) {
    logger.init(logCallback);
    logger.setup(Logger.LogLevel.Log);
  }
  public log(message: string): void {
    if (this.enable) {
      const now = new Date();
      const month = pad(String(now.getMonth()), 2, '0');
      const date = pad(String(now.getDate()), 2, '0');
      const hours = pad(String(now.getHours()), 2, '0');
      const minutes = pad(String(now.getMinutes()), 2, '0');
      const seconds = pad(String(now.getSeconds()), 2, '0');
      const milliSeconds = pad(String(now.getMilliseconds()), 3, '0');
      logger.log(`${now.getFullYear()}-${month}-${date} ${hours}:${minutes}:${seconds}.${milliSeconds} Trace ${message}`);
    }
  }
}
