import * as esbuild from 'esbuild';
import { now } from '../utils';

const linebreak = '\n';
const watchCompletedMessage = '[esbuild] completed at';
export const startWatch = async(options: esbuild.BuildOptions): Promise<void> => {
  console.log(`${watchCompletedMessage} ${now()}`);
  const context = await esbuild.context({
    ...options,
    plugins: [
      {
        name: 'incremental',
        setup: (build) => {
          build.onEnd((result) => {
            const additionalMessage = [ result.errors, result.warnings ].flatMap((results): string[] => {
              return results.map((result) => `${result.pluginName}: ${result.detail}`);
            }).join(linebreak);
            if (additionalMessage) {
              console.log(additionalMessage);
            }

            console.log(`${watchCompletedMessage} ${now()}`);
          });
        },
      },
    ],
  });
  context.watch();
};
