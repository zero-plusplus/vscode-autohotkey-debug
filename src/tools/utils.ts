export const safeCall = <D, R, ARG, T extends (...args: ARG[]) => R>(callback: T, args?: ARG[], defaultValue?: D): R | D => {
  try {
    return callback(...(args ?? []));
  }
  catch {
  }
  return defaultValue as D;
};
