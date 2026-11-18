const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MIN_RAISE,
  MAX_REQUESTS_PER_PROPERTY,
  highestPriorBid,
  evaluateFollowUp
} = require('../utils/rentalRequestPolicy');

test('highestPriorBid returns the largest positive previous offer', () => {
  assert.equal(highestPriorBid([
    { proposedRent: 10000 },
    { proposedRent: 14500 },
    { proposedRent: 0 },
    { proposedRent: 'invalid' }
  ]), 14500);
});

test('a first request does not require a follow-up increase', () => {
  assert.deepEqual(evaluateFollowUp([], 10000), {
    allowed: true,
    priorBid: null,
    minimumOffer: null
  });
});

test('a follow-up request requires the configured increase over the highest bid', () => {
  const previous = [{ proposedRent: 14000 }];

  assert.equal(evaluateFollowUp(previous, 14000).allowed, false);
  assert.equal(evaluateFollowUp(previous, 14000 + MIN_RAISE).allowed, true);
});

test('a tenant cannot exceed the per-property request limit', () => {
  const previous = Array.from({ length: MAX_REQUESTS_PER_PROPERTY }, (_, i) => ({
    proposedRent: 10000 + i * MIN_RAISE
  }));
  const result = evaluateFollowUp(previous, 20000);

  assert.equal(result.allowed, false);
  assert.equal(result.code, 'REQUEST_LIMIT');
});
