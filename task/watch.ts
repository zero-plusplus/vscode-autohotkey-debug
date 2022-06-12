import * as esbuild from 'esbuild';
import { esbuildDebugOptions } from './_config';

(async(): Promise<void> => {
  await esbuild.build({
    ...esbuildDebugOptions,
    incremental: true,
    watch: {
      onRebuild: (err, result) => {
        if (err) {
          console.log(`[esbuild] error: ${err.message}`);
        }
        console.log(`[esbuild] build completed`);
      },
    },
  });
  console.log('[esbuild] build completed');
})();
