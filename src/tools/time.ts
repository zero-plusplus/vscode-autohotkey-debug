import { Time, Timer } from '../types/tools/time.types';

export function secondsToMilliSeconds(s: number): number {
  return s * 1e3;
}
export function secondsToNanoSeconds(s: number): number {
  return s * 1e9;
}
export function milliSecondsToNanoSeconds(ms: number): number {
  return ms * 1e3;
}
export function milliSecondsToSeconds(ms: number): number {
  return ms / 1e3;
}
export function nanoSecondsToSeconds(ns: number): number {
  return ns / 1e9;
}
export function nanoSecondsToMilliSeconds(ns: number): number {
  return ns * 1e6;
}

export const hrtimeToTime = (hrtime: [ number, number ]): Time => {
  const [ elapsed_s, elapsed_ns ] = hrtime;
  const nanoseconds = secondsToNanoSeconds(elapsed_s) + elapsed_ns;
  const seconds = elapsed_s + nanoSecondsToSeconds(elapsed_ns);
  const milliSeconds = secondsToMilliSeconds(elapsed_s) + nanoSecondsToMilliSeconds(elapsed_ns);
  return {
    ns: nanoseconds,
    s: seconds,
    ms: milliSeconds,
  };
};
export const startTimer = (): Timer => {
  const start = process.hrtime();
  return {
    startTime: hrtimeToTime(start),
    stop: (): Time => {
      return hrtimeToTime(process.hrtime(start));
    },
  };
};
export const measureExecutionTime = <Result>(callback: () => Result): [ Result, Time ] => {
  const timer = startTimer();

  const result = callback();
  const elapsedTime = timer.stop();
  return [ result, elapsedTime ];
};
export const measureAsyncExecutionTime = async<Result>(callback: () => Promise<Result>): Promise<[ Result, Time ]> => {
  const timer = startTimer();

  const result = await callback();
  const elapsedTime = timer.stop();
  return [ result, elapsedTime ];
};
