import { MergeDeep } from 'type-fest';

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
