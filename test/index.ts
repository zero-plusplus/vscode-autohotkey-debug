import * as assert from 'assert';

const addition = function(a: number, b: number): number {
  return a + b;
};
test('mocha mock test', () => {
  assert.equal(addition(1, 5), 6);
});
