export const memoize = <ARGS extends any[], T extends (...args: ARGS) => any>(originalFunction: T, keyGenerator: (...args: ARGS) => string = (...args): string => JSON.stringify(args)): T => {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = (...args: ARGS): any => {
    const key = keyGenerator(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = originalFunction(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  };
  return memoized as T;
};
