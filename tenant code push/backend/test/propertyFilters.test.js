const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePropertyNumericFilters } = require('../utils/propertyFilters');

test('property numeric filters accept valid non-negative values', () => {
  assert.deepEqual(parsePropertyNumericFilters({ beds: '2', maxRent: '12500.5' }), {
    valid: true,
    beds: 2,
    maxRent: 12500.5
  });
  assert.deepEqual(parsePropertyNumericFilters({ beds: '0', maxRent: '0' }), {
    valid: true,
    beds: 0,
    maxRent: 0
  });
});

test('property numeric filters leave omitted values unset', () => {
  assert.deepEqual(parsePropertyNumericFilters({}), {
    valid: true,
    beds: null,
    maxRent: null
  });
});

test('property numeric filters reject invalid or fractional bedroom counts', () => {
  assert.deepEqual(parsePropertyNumericFilters({ beds: '-1' }), { valid: false, field: 'beds' });
  assert.deepEqual(parsePropertyNumericFilters({ beds: '1.5' }), { valid: false, field: 'beds' });
  assert.deepEqual(parsePropertyNumericFilters({ beds: 'many' }), { valid: false, field: 'beds' });
});

test('property numeric filters reject invalid or negative rent limits', () => {
  assert.deepEqual(parsePropertyNumericFilters({ maxRent: '-1' }), { valid: false, field: 'maxRent' });
  assert.deepEqual(parsePropertyNumericFilters({ maxRent: 'Infinity' }), { valid: false, field: 'maxRent' });
});
