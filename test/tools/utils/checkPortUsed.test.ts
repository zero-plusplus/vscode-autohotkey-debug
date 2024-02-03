import * as net from 'net';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { checkPortUsed } from '../../../src/tools/utils';
import * as attributes from '../../../src/client/config/attributes';

describe('checkPortUsed', () => {
  const port = attributes.port.defaultValue;
  describe('non-problem', () => {
    test('checkPortUsed(port)', async() => {
      expect(await checkPortUsed(port)).toBeFalsy();
    });
    test('checkPortUsed(port, timeout_ms)', async() => {
      expect(await checkPortUsed(port, 1000)).toBeFalsy();
    });
    test('checkPortUsed(port, hostname, timeout_ms)', async() => {
      expect(await checkPortUsed(port, 'localhost', 1000)).toBeFalsy();
    });
  });

  describe('used port', () => {
    let server: net.Server;
    beforeAll(async() => {
      return new Promise<void>((resolve) => {
        server = net.createServer();
        server.listen(port, () => {
          resolve();
        });
      });
    });
    afterAll(async() => {
      server.close();
      return Promise.resolve();
    });

    test('used port', async() => {
      expect(await checkPortUsed(port)).toBeTruthy();
    });
  });
});
