import * as path from 'path';
import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule, PathAttributeRule } from '../../../types/tools/validator';
import { directoryExists, fileExists } from '../../../tools/predicate';

export const attributeName = 'program';
export const dependAttributes: Array<keyof DebugConfig> = [ 'runtime' ];
export const attributeRule: AttributeRule<DebugConfig['program']> & PathAttributeRule = validators.file().depends(...dependAttributes);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['program'], DebugConfig> = {
  undefined: (value, schema, onError) => {
    // Case 1: [Default file name](https://www.autohotkey.com/docs/v2/Scripts.htm#defaultfile)
    // Only if the appropriate `runtime` is set before validation
    if (schema.isNormalized('runtime')) {
      const runtime = schema.getNormalizedAttribute('runtime');
      if (fileExists(runtime)) {
        const fileName = `${path.basename(runtime, path.extname(runtime))}.ahk`;
        const program = path.resolve(path.dirname(runtime), fileName);
        return program;
      }
      if (directoryExists(runtime)) {
        const fileName = path.basename(runtime, 'AutoHotkey.ahk');
        const program = path.resolve(runtime, fileName);
        return program;
      }
    }

    // Case 2: If the editor can provide an open file
    if (schema.has('__filename')) {
      const currentFile = schema.getRawAttribute<string | undefined>('__filename');
      if (currentFile) {
        return currentFile;
      }
    }

    return value as unknown as DebugConfig['program'];
  },
};
