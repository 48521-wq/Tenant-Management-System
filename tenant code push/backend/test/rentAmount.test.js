const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRentAmount } = require('../utils/rentAmount');

test('parseRentAmount accepts positive numbers and numeric strings', () => {
  assert.deepEqual(parseRentAmount(12000), { valid: true, value: 12000 });
  assert.deepEqual(parseRentAmount('12500'), { valid: true, value: 12500 });
});

test('parseRentAmount treats an omitted or blank optional offer as absent', () => {
  assert.deepEqual(parseRentAmount(undefined), { valid: true, value: null });
  assert.deepEqual(parseRentAmount('  '), { valid: true, value: null });
});

test('parseRentAmount rejects zero, negative, non-finite, and non-numeric values', () => {
  for (const value of [0, -1, 'nope', 'Infinity', NaN, Infinity, true, {}]) {
    assert.deepEqual(parseRentAmount(value), { valid: false, value: null });
  }
});
