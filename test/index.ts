import * as assert from 'assert';

const addition = function(a: number, b: number): number {
  return a + b;
};
test('mocha mock test', () => {
  assert.strictEqual(addition(1, 5), 6);
});
