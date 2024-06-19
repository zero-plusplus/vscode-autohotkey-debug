export const countBy = <T>(iteratable: Record<string, T> | T[], predicate: (value: T) => boolean): number => {
  let count = 0;

  const keys = Object.keys(iteratable);
  for (const key of keys) {
    const value = iteratable[key] as T;
    if (predicate(value)) {
      count++;
    }
  }

  return count;
};
