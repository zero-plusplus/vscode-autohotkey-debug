export const safeCall = <T extends (...args: any[]) => any>(callback: T, args?: Parameters<T>): ReturnType<T> | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
    return callback(...(args ?? []));
  }
  catch {
  }
  return undefined;
};
