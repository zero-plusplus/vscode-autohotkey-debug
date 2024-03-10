import { describe, expect, test } from '@jest/globals';
import { Time } from '../../src/types/tools/time.types';
import { sleep } from '../../src/tools/promise';
import { measureAsyncExecutionTime, milliSecondsToNanoSeconds, milliSecondsToSeconds } from '../../src/tools/time';

describe('time', () => {
  test.each`
    time_ms
    ${500}
    ${1000}
    ${1500}
  `('', async({ time_ms }): Promise<void> => {
    const callback = async(): Promise<void> => sleep(Number(time_ms));
    const expectedElapsedTime: Time = { ns: milliSecondsToNanoSeconds(Number(time_ms)), ms: Number(time_ms), s: milliSecondsToSeconds(Number(time_ms)) };

    const [ , actualElapsedTime ] = await measureAsyncExecutionTime(callback);
    expect(expectedElapsedTime.ns).toBeLessThanOrEqual(actualElapsedTime.ns);
    expect(expectedElapsedTime.ms).toBeLessThanOrEqual(actualElapsedTime.ms);
    expect(expectedElapsedTime.s).toBeLessThanOrEqual(actualElapsedTime.s);
  });
});
