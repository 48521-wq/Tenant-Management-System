const test = require('node:test');
const assert = require('node:assert/strict');
const { canCreateFollowUpRequest } = require('../utils/rentalRequestPolicy');

test('allows a second request when the new offer is higher than the prior pending offer', () => {
  const existing = {
    status: 'pending',
    proposedRent: 40000,
    propertyRent: 35000
  };

  assert.equal(canCreateFollowUpRequest(existing, 45000), true);
});

test('blocks a second request when the new offer is not higher than the prior pending offer', () => {
  const existing = {
    status: 'pending',
    proposedRent: 40000,
    propertyRent: 35000
  };

  assert.equal(canCreateFollowUpRequest(existing, 39000), false);
});

test('allows a new request after a prior request was rejected or cancelled', () => {
  const existing = {
    status: 'rejected',
    proposedRent: 40000,
    propertyRent: 35000
  };

  assert.equal(canCreateFollowUpRequest(existing, 41000), true);
});
