// #region date time
export const now = (): string => {
  const currentDate = new Date();
  const YYYY = currentDate.getFullYear();
  const MM = currentDate.getMonth() + 1;
  const DD = currentDate.getDate();
  const HH = currentDate.getHours();
  const mm = currentDate.getMinutes();
  const ss = currentDate.getSeconds();
  const sss = currentDate.getMilliseconds();
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${sss}`;
};
export const msToSec = (number_ms: number): number => number_ms / 1000;
// #endregion date time

// #region task utils
export type Task<R> = () => Promise<R> | Promise<void>;
export const measureExecutionTime = async<R>(task: Task<R>): Promise<number> => {
  const startTime = performance.now();
  await task();

  const executionTime_ms = Number(performance.now() - startTime);
  return executionTime_ms;
};
export const runTask = async<R>(taskName: string, task: Task<R>, isBackground = false): Promise<void> => {
  console.log(isBackground
    ? `[${taskName}]: started background task at ${now()}`
    : `[${taskName}]: started task at ${now()}`);

  const executionTime_s = msToSec(await measureExecutionTime(task)).toFixed(3);
  if (!isBackground) {
    console.log(`[${taskName}]: completed process at ${now()}`);
    console.log(`[${taskName}]: finished task in ${executionTime_s}s`);
  }
};
export const createTask = <R>(taskName: string, task: Task<R>, isBackground = false): Task<R> => {
  return async() => {
    return runTask(taskName, task, isBackground);
  };
};
export const createBackgroundTask = <R>(taskName: string, task: Task<R>): Task<R> => {
  return createTask(taskName, task, true);
};
// #endregion task utils
