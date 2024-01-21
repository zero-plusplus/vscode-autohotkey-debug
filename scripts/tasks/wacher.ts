import * as esbuild from 'esbuild';
import { now } from '../utils';

const watchCompletedMessage = '[esbuild] completed at';
export const startWatch = async(options: esbuild.BuildOptions): Promise<void> => {
  console.log(`${watchCompletedMessage} ${now()}`);
  await esbuild.build({
    ...options,
    incremental: true,
    watch: {
      onRebuild: (err, result) => {
        if (err) {
          console.log(`[esbuild] ERROR >>>\n ${err.message}\n <<<`);
        }
        console.log(`${watchCompletedMessage} ${now()}`);
      },
    },
  });
};
