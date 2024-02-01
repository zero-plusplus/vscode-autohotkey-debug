import { MergeDeep } from 'type-fest';

export const safeCall = <D, R, ARG, T extends (...args: ARG[]) => R>(callback: T, args?: ARG[], defaultValue?: D): R | D => {
  try {
    return callback(...(args ?? []));
  }
  catch {
  }
  return defaultValue as D;
};

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

export const deepDefaults = <DEST extends object, S1 extends object, S2 extends object>(dest: DEST, ...sources: [ S1, S2?, ...any ]): MergeDeep<MergeDeep<S2, S1>, DEST> => {
  for (const source of sources.reverse()) {
    if (typeof source !== 'object') {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const [ key, sourceValue ] of Object.entries(source)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const destValue = dest[key];
      if (typeof destValue === 'object' && (sourceValue && typeof sourceValue === 'object')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        dest[key] = deepDefaults({ ...destValue }, sourceValue);
        continue;
      }

      if (Object.hasOwn(dest, key)) {
        continue;
      }
      dest[key] = sourceValue;
    }
  }
  return dest as MergeDeep<MergeDeep<S2, S1>, DEST>;
};
