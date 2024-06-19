export function repeatUntil<T>(callback: ((index: number) => T | undefined), firstCount = 0, step = 1): T[] {
  const results: T[] = [];

  let loopIndex = firstCount;
  while (true) {
    const result = callback(loopIndex);
    if (result === undefined) {
      break;
    }
    results.push(result);
    loopIndex += step;
  }

  return results;
}
export async function repeatUntilAsync<T>(callback: ((index: number) => Promise<T | undefined>), firstCount = 0, step = 1): Promise<T[]> {
  const results: T[] = [];

  let loopIndex = firstCount;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const result = await callback(loopIndex);
    if (result === undefined) {
      break;
    }
    results.push(result);
    loopIndex += step;
  }

  return results;
}
