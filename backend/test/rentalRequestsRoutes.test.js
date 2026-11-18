const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/rentalRequests');
const Property = require('../models/Property');
const RentalRequest = require('../models/RentalRequest');

function getHandler(path, method) {
  const layer = router.stack.find(item => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `Missing ${method.toUpperCase()} ${path} route`);
  return layer.route.stack.at(-1).handle;
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('only tenants can create rental requests', async t => {
  const propertyLookup = t.mock.method(Property, 'findById', async () => {
    throw new Error('Property lookup should not run for non-tenants');
  });
  const res = response();

  await getHandler('/request', 'post')({ user: { role: 'landlord' }, body: {} }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Tenant access required.');
  assert.equal(propertyLookup.mock.callCount(), 0);
});

for (const path of ['/:id/accept', '/:id/reject']) {
  test(`${path} returns 404 if the associated property was deleted`, async t => {
    t.mock.method(RentalRequest, 'findById', async () => ({ propertyId: 'missing-property' }));
    t.mock.method(Property, 'findById', async () => null);
    const res = response();

    await getHandler(path, 'put')(
      { params: { id: 'request-id' }, user: { _id: 'landlord-id' } },
      res
    );

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Property not found.');
  });
}
