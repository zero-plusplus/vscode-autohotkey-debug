/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, expect, test } from '@jest/globals';
import { parseXml } from '../../src/tools/xml';
import { FeatureSetResponse, InitPacket, ResponsePacket } from '../../src/types/dbgp/ExtendAutoHotkeyDebugger';

describe('xml', () => {
  describe('parseXml', () => {
    test('init packet', () => {
      const xmlString = `
        <?xml version="1.0" encoding="UTF-8"?>
        <init
          appid="AutoHotkey"
          ide_key=""
          session=""
          thread="123"
          parent=""
          language="AutoHotkey"
          protocol_version="1.0"
          fileuri="file:///C%3A/ahk/sample.ahk"
        />
      `;

      const xml = parseXml(xmlString) as InitPacket;
      expect(xml.init.attributes.appid).toBe('AutoHotkey');
      expect(xml.init.attributes.ide_key).toBe('');
      expect(xml.init.attributes.session).toBe('');
      expect(xml.init.attributes.thread).toBe('123');
      expect(xml.init.attributes.language).toBe('AutoHotkey');
      expect(xml.init.attributes.protocol_version).toBe('1.0');
      expect(xml.init.attributes.fileuri).toBe('file:///C%3A/ahk/sample.ahk');
    });
    describe('response packet', () => {
      test('feature_set', () => {
        const xmlString = `
          <?xml version="1.0" encoding="UTF-8"?>
          <response
            command="feature_set"
            feature="max_depth"
            success="1"
            transaction_id="2"
          />
        `;
        const response = (parseXml(xmlString) as ResponsePacket).response.attributes as FeatureSetResponse;
        expect(response.command).toBe('feature_set');
        expect(response.feature).toBe('max_depth');
        expect(response.success).toBe('1');
        expect(response.transaction_id).toBe('2');
      });
    });
  });
});


