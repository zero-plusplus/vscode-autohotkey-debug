let timeoutId: number | undefined;
export const sleep = async(delay_ms: number): Promise<void> => new Promise((resolve) => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(resolve, delay_ms);
});

export class TimeoutError extends Error {
  constructor(timeout_ms: number) {
    super(`Operation timed out after ${timeout_ms}ms.`);
  }
}
export const timeoutPromise = async<T>(promise: Promise<T>, timeout_ms: number): Promise<T | void> => {
  return Promise.race([
    promise,
    new Promise<void>((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new TimeoutError(timeout_ms));
      }, timeout_ms);
    }),
  ]);
};
