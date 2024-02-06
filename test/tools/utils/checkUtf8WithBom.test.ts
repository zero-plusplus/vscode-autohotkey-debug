import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../src/tools/temp';
import { checkUtf8WithBomByFile, checkUtf8WithBomByText, utf8BomText } from '../../../src/tools/utils/checkUtf8WithBom';
import { readFileSync } from 'fs';

describe('checkUtf8WithBom', () => {
  let tempUtf8: TemporaryResource;
  let tempUtf8WithBom: TemporaryResource;
  beforeAll(async() => {
    const text = 'foo';
    tempUtf8 = await createTempDirectoryWithFile('utf8-with-bom', '.ahk', text);
    tempUtf8WithBom = await createTempDirectoryWithFile('utf8-with-bom', '.ahk', `${utf8BomText}${text}`);
  });
  afterAll(() => {
    tempUtf8.cleanup();
    tempUtf8WithBom.cleanup();
  });

  test('checkUtf8WithBomByFile', async() => {
    expect(await checkUtf8WithBomByFile(tempUtf8.path)).toBeFalsy();
    expect(await checkUtf8WithBomByFile(tempUtf8WithBom.path)).toBeTruthy();
  });
  test('checkUtf8WithBomByText', () => {
    const utf8Text = readFileSync(tempUtf8.path, 'utf-8');
    const utf8WithBomText = readFileSync(tempUtf8WithBom.path, 'utf-8');

    expect(checkUtf8WithBomByText(utf8Text)).toBeFalsy();
    expect(checkUtf8WithBomByText(utf8WithBomText)).toBeTruthy();
  });
});
