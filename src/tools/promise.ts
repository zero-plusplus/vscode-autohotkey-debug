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

const cache = new Map<string, Mutex>();
export const createMutex = (key = ''): Mutex => {
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  let currentTaskResult: Promise<any> = Promise.resolve();
  const mutex: Mutex = {
    use: async<T>(task: Task<T>): Promise<T> => {
      currentTaskResult = currentTaskResult.then(async() => {
        return task();
      });
      return currentTaskResult as Promise<T>;
    },
  };

  cache.set(key, mutex);
  return mutex;
};
