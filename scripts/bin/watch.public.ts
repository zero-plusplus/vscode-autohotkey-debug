import { runWatchByPublicBuild } from '../tasks';

(async function main(): Promise<void> {
  await runWatchByPublicBuild();
}());
