import { describe, expect, test } from '@jest/globals';
import { TimeoutError, createMutex, sleep, timeoutPromise } from '../../src/tools/promise';

describe('promise', () => {
  test('timeoutPromise / sleep', () => {
    expect(timeoutPromise(sleep(1000), 500)).rejects.toThrow(TimeoutError);
  });

  describe('createMutex', () => {
    test('main', async() => {
      const results: string[] = [];
      const mutex = createMutex();

      const promises: Array<Promise<any>> = [];
      const lockKey = 'key';
      promises.push(mutex.use(lockKey, async() => {
        await sleep(1000);
        results.push('a');
      }));
      promises.push(mutex.use(lockKey, async() => {
        await sleep(500);
        results.push('b');
      }));

      await Promise.all(promises);
      expect(results).toEqual([ 'a', 'b' ]);
    });
  });
});
