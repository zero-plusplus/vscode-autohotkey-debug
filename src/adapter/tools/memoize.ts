/* eslint-disable @typescript-eslint/no-unsafe-argument */

export type Callable<R> = (...args: any[]) => R;
export const memoize = <R, T extends Callable<R> = Callable<R>>(memoizeTarget: T, serialize: (...args: Parameters<T>) => string = (...args): string => JSON.stringify(args)): T => {
  const cache = new Map<string, R>();

  const memoized = (...args: Parameters<T>): R => {
    const key = serialize(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = memoizeTarget(...args);
    cache.set(key, result);
    return result;
  };

  return memoized as T;
};
export const singleton = <R, T extends Callable<R> = Callable<R>>(memoizeTarget: T): T => {
  return memoize(memoizeTarget, () => '');
};
