import { AhkDebugSession } from './ahkDebug';

const session = new AhkDebugSession();
process.on('SIGTERM', () => {
  session.shutdown();
});
session.start(process.stdin, process.stdout);
