import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('variableCategories', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'variableCategories'>>({
    variableCategories: attributes.variableCategories.attributeRule,
  }).normalizeProperties({ variableCategories: attributes.variableCategories.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `undefined`',
      async() => expect(schema.apply({ variableCategories: undefined })).resolves.toEqual({ variableCategories: false }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ variableCategories: false })).resolves.toEqual({ variableCategories: false }),
    );
    test(
      'Specified `recommend`',
      async() => expect(schema.apply({ variableCategories: 'recommend' })).resolves.toEqual({ variableCategories: attributes.variableCategories.recommendValue }),
    );

    describe('VariableCategory', () => {
      describe('label', () => {
        test(
          'Specified string',
          async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [] } ] }))
            .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [] } ] }),
        );
      });
      describe('items', () => {
        describe('VariableCategoryItem', () => {
          describe('variableName', () => {
            test(
              'Specified string',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { variableName: 'Foo', scope: 'Local' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { variableName: 'Foo', scope: 'Local' } ] } ] }),
            );
          });
          describe('scope', () => {
            test(
              'Specified "Local"',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { scope: 'Local', variableName: 'Foo' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { scope: 'Local', variableName: 'Foo' } ] } ] }),
            );
            test(
              'Specified "Global"',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { scope: 'Global', variableName: 'Foo' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { scope: 'Global', variableName: 'Foo' } ] } ] }),
            );
            test(
              'Specified "Static"',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { scope: 'Static', variableName: 'Foo' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { scope: 'Static', variableName: 'Foo' } ] } ] }),
            );
          });
        });
        describe('ExpressionCategoryItem', () => {
          describe('label', () => {
            test(
              'Specified `string`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { label: 'Bar' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { label: 'Bar', expression: 'Bar' } ] } ] }),
            );
          });
          describe('expression', () => {
            test(
              'Specified `undefined`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { label: 'Bar' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { expression: 'Bar', label: 'Bar' } ] } ] }),
            );
            test(
              'Specified `string`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { expression: 'Baz', label: 'Bar' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { expression: 'Baz', label: 'Bar' } ] } ] }),
            );
          });
        });
        describe('CategoryItemSelector', () => {
          describe('source', () => {
            test(
              'Specified `"*"`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { source: '*' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { source: '*' } ] } ] }),
            );
            test(
              'Specified `"Local"`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { source: 'Local' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { source: 'Local' } ] } ] }),
            );
            test(
              'Specified `"Global"`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { source: 'Global' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { source: 'Global' } ] } ] }),
            );
            test(
              'Specified `"Static"`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { source: 'Static' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { source: 'Static' } ] } ] }),
            );
            test(
              'Specified `SourceName[]`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { source: [ 'Local', 'Global', 'Static' ] } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { source: [ 'Local', 'Global', 'Static' ] } ] } ] }),
            );
          });
          describe('select', () => {
            test(
              'Specified `string`',
              async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: '>Foo', source: '*' } ] } ] }))
                .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: '>Foo', source: '*' } ] } ] }),
            );
            describe('VariableMatcher', () => {
              describe('pattern', () => {
                test(
                  'Specified `undefined`',
                  async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { pattern: undefined }, source: '*' } ] } ] }))
                    .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { pattern: undefined }, source: '*' } ] } ] }),
                );
                test(
                  'Specified `string`',
                  async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { pattern: '>Foo' }, source: '*' } ] } ] }))
                    .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { pattern: '>Foo' }, source: '*' } ] } ] }),
                );
              });
              describe('attributes', () => {
                test(
                  'Specified `undefined`',
                  async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: undefined }, source: '*' } ] } ] }))
                    .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: undefined }, source: '*' } ] } ] }),
                );
                describe('VariableAttributes', () => {
                  describe('type', () => {
                    test(
                      'Specified `string`',
                      async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { type: 'object' } }, source: '*' } ] } ] }))
                        .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { type: 'object' } }, source: '*' } ] } ] }),
                    );
                  });
                  describe('className', () => {
                    test(
                      'Specified `string`',
                      async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { className: 'Array' } }, source: '*' } ] } ] }))
                        .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { className: 'Array' } }, source: '*' } ] } ] }),
                    );
                  });
                  describe('isBuiltin', () => {
                    test(
                      'Specified `boolean`',
                      async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { isBuiltin: true } }, source: '*' } ] } ] }))
                        .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { isBuiltin: true } }, source: '*' } ] } ] }),
                    );
                  });
                  describe('isStatic', () => {
                    test(
                      'Specified `boolean`',
                      async() => expect(schema.apply({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { isStatic: true } }, source: '*' } ] } ] }))
                        .resolves.toEqual({ variableCategories: [ { label: 'Foo', items: [ { select: { attributes: { isStatic: true } }, source: '*' } ] } ] }),
                    );
                  });
                });
              });
            });
          });
        });
      });
      describe('visible', () => {
        test(
          'Specified `true`',
          async() => expect(schema.apply({ variableCategories: [ { visible: true, label: 'Foo', items: [] } ] }))
            .resolves.toEqual({ variableCategories: [ { visible: true, label: 'Foo', items: [] } ] }),
        );
        test(
          'Specified `false`',
          async() => expect(schema.apply({ variableCategories: [ { visible: false, label: 'Foo', items: [] } ] }))
            .resolves.toEqual({ variableCategories: [ { visible: false, label: 'Foo', items: [] } ] }),
        );
        test(
          'Specified `string`',
          async() => expect(schema.apply({ variableCategories: [ { visible: 'IsSet(UnitTest)', label: 'Foo', items: [] } ] }))
            .resolves.toEqual({ variableCategories: [ { visible: 'IsSet(UnitTest)', label: 'Foo', items: [] } ] }),
        );
      });
      describe('filters', () => {
        test(
          'Specified `undefined`',
          async() => expect(schema.apply({ variableCategories: [ { filters: undefined, label: 'Foo', items: [] } ] }))
            .resolves.toEqual({ variableCategories: [ { filters: undefined, label: 'Foo', items: [] } ] }),
        );
        describe('DefinedCategoryName', () => {
          test(
            'Specified `"Local"`',
            async() => expect(schema.apply({ variableCategories: [ { filters: 'Local', label: 'Foo', items: [] } ] }))
              .resolves.toEqual({ variableCategories: [ { filters: 'Local', label: 'Foo', items: [] } ] }),
          );
          test(
            'Specified `"Global"`',
            async() => expect(schema.apply({ variableCategories: [ { filters: 'Global', label: 'Foo', items: [] } ] }))
              .resolves.toEqual({ variableCategories: [ { filters: 'Global', label: 'Foo', items: [] } ] }),
          );
          test(
            'Specified `"Global"`',
            async() => expect(schema.apply({ variableCategories: [ { filters: 'Static', label: 'Foo', items: [] } ] }))
              .resolves.toEqual({ variableCategories: [ { filters: 'Static', label: 'Foo', items: [] } ] }),
          );
          test(
            'Specified `"Builtin-Global"`',
            async() => expect(schema.apply({ variableCategories: [ { filters: 'Builtin-Global', label: 'Foo', items: [] } ] }))
              .resolves.toEqual({ variableCategories: [ { filters: 'Builtin-Global', label: 'Foo', items: [] } ] }),
          );
          test(
            'Specified `"UserDefined-Global"`',
            async() => expect(schema.apply({ variableCategories: [ { filters: 'UserDefined-Global', label: 'Foo', items: [] } ] }))
              .resolves.toEqual({ variableCategories: [ { filters: 'UserDefined-Global', label: 'Foo', items: [] } ] }),
          );
        });
      });
    });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ variableCategories: 'abc' })).rejects.toThrow(),
    );
  });
});
