const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/rentalRequests');
const Property = require('../models/Property');
const RentalRequest = require('../models/RentalRequest');
const User = require('../models/User');

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

test('tenants with incomplete profiles cannot request rentals', async t => {
  const propertyLookup = t.mock.method(Property, 'findById', () => {
    throw new Error('Property lookup should not run for an incomplete tenant profile');
  });
  const res = response();

  await getHandler('/request', 'post')({
    user: {
      role: 'tenant',
      name: 'Tenant Name',
      email: 'tenant@example.com',
      phone: '',
      cnic: ''
    },
    body: { propertyId: 'property-id', proposedRent: 1000 }
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PROFILE_INCOMPLETE');
  assert.deepEqual(res.body.missingFields, ['phone', 'cnic']);
  assert.equal(propertyLookup.mock.callCount(), 0);
});

test('tenants cannot request a rental from a landlord with an incomplete profile', async t => {
  t.mock.method(Property, 'findById', async () => ({ status: 'available', landlordId: 'landlord-id' }));
  t.mock.method(User, 'findById', async () => ({
    name: 'Landlord Name',
    email: 'landlord@example.com',
    phone: '03123456789',
    cnic: ''
  }));
  const createRequest = t.mock.method(RentalRequest, 'create', () => {
    throw new Error('Rental request should not be created for an incomplete landlord profile');
  });
  const res = response();

  await getHandler('/request', 'post')({
    user: {
      _id: 'tenant-id',
      role: 'tenant',
      name: 'Tenant Name',
      email: 'tenant@example.com',
      phone: '03123456789',
      cnic: '3520212345671'
    },
    body: { propertyId: 'property-id', proposedRent: 1000 }
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PROFILE_INCOMPLETE');
  assert.deepEqual(res.body.missingFields, ['cnic']);
  assert.equal(createRequest.mock.callCount(), 0);
});

test('rental approval is blocked if the tenant profile became incomplete', async t => {
  const rentalRequest = {
    propertyId: 'property-id',
    tenantId: 'tenant-id',
    status: 'docs_submitted',
    save: async () => {
      throw new Error('Rental request should not be approved for an incomplete tenant profile');
    }
  };
  t.mock.method(RentalRequest, 'findById', async () => rentalRequest);
  t.mock.method(Property, 'findById', async () => ({ landlordId: 'landlord-id' }));
  let userLookups = 0;
  t.mock.method(User, 'findById', async () => {
    userLookups++;
    return userLookups === 1
      ? {
          name: 'Landlord Name',
          email: 'landlord@example.com',
          phone: '03123456789',
          cnic: '3520212345671'
        }
      : {
          name: 'Tenant Name',
          email: 'tenant@example.com',
          phone: '',
          cnic: '3520212345671'
        };
  });
  const res = response();

  await getHandler('/:id/verify-docs', 'put')({
    params: { id: 'request-id' },
    user: {
      _id: 'landlord-id',
      role: 'landlord',
      name: 'Landlord Name',
      email: 'landlord@example.com',
      phone: '03123456789',
      cnic: '3520212345671'
    },
    body: { action: 'approve' }
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PROFILE_INCOMPLETE');
  assert.deepEqual(res.body.missingFields, ['phone']);
  assert.equal(userLookups, 2);
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
