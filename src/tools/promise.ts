import { Mutex, Task } from '../types/tools/promise.types';

export const sleep = async(delay_ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay_ms);
  });
};

export class TimeoutError extends Error {
  constructor(timeout_ms: number) {
    super(`Operation timed out after ${timeout_ms}ms.`);
  }
}
export const timeoutPromise = async<T>(promise: Promise<T>, timeout_ms: number): Promise<T> => {
  const result = await Promise.race([
    promise,
    new Promise<void>((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new TimeoutError(timeout_ms));
      }, timeout_ms);
    }),
  ]);
  return result as T;
};
export const timeoutTask = async<T>(task: () => Promise<T>, timeout_ms: number): Promise<T> => {
  const result = await Promise.race([
    task,
    new Promise<void>((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new TimeoutError(timeout_ms));
      }, timeout_ms);
    }),
  ]);
  return result as T;
};

export const createMutex = (): Mutex => {
  const cache = new Map<string, Promise<any>>();

  const mutex: Mutex = {
    use: async<T>(key: string, task: Task<T>): Promise<T> => {
      let currentTaskResult = cache.has(key) ? cache.get(key)! : Promise.resolve();
      currentTaskResult = currentTaskResult.then(async() => {
        return task();
      });
      cache.set(key, currentTaskResult);
      return currentTaskResult as Promise<T>;
    },
  };
  return mutex;
};
