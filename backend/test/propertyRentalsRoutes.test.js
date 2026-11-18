const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/properties');
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

test('my-rentals only allows tenant accounts', async t => {
  const propertyLookup = t.mock.method(Property, 'find', () => {
    throw new Error('Property lookup should not run for non-tenants');
  });
  const res = response();

  await getHandler('/my-rentals', 'get')({ user: { role: 'landlord' } }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Tenant access required.');
  assert.equal(propertyLookup.mock.callCount(), 0);
});

test('my-rentals returns all active properties assigned to the authenticated tenant', async t => {
  const tenantId = 'tenant-id';
  const properties = [{ _id: 'property-one' }, { _id: 'property-two' }];
  const query = {
    select(fields) {
      assert.match(fields, /tenantFurnitureLayout/);
      assert.match(fields, /landlordId/);
      return this;
    },
    sort(sort) {
      assert.deepEqual(sort, { createdAt: -1 });
      return Promise.resolve(properties);
    }
  };
  t.mock.method(Property, 'find', filter => {
    assert.deepEqual(filter, {
      tenantId,
      status: { $in: ['rented', 'suspended'] }
    });
    return query;
  });
  t.mock.method(RentalRequest, 'find', filter => {
    assert.deepEqual(filter, { tenantId, status: 'accepted' });
    return {
      select(fields) {
        assert.equal(fields, 'propertyId');
        return {
          lean: () => Promise.resolve([])
        };
      }
    };
  });
  const res = response();

  await getHandler('/my-rentals', 'get')({ user: { _id: tenantId, role: 'tenant' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 2);
  assert.deepEqual(res.body.properties, properties);
});

test('my-rentals repairs an active rental from its latest approved request', async t => {
  const tenantId = 'tenant-id';
  const propertyId = 'property-two';
  const property = {
    _id: propertyId,
    tenantId: 'stale-tenant-id',
    tenantName: 'Current tenant',
    status: 'rented',
    createdAt: new Date('2026-01-02')
  };
  const repairedProperty = { ...property, tenantId, tenantName: 'Current tenant' };
  const propertyFilters = [];
  t.mock.method(Property, 'find', filter => {
    propertyFilters.push(filter);
    return {
      select() {
        if (propertyFilters.length === 1) {
          return {
            sort: () => Promise.resolve([])
          };
        }
        return Promise.resolve([property]);
      }
    };
  });
  const requestFilters = [];
  t.mock.method(RentalRequest, 'find', filter => {
    requestFilters.push(filter);
    return {
      select() { return this; },
      sort() { return this; },
      lean() {
        return Promise.resolve(requestFilters.length === 1
          ? [{ propertyId }]
          : [{
              propertyId,
              tenantId,
              tenantName: 'Current tenant',
              updatedAt: new Date('2026-01-03')
            }]);
      }
    };
  });
  const updateQuery = {
    select(fields) {
      assert.match(fields, /tenantId/);
      return Promise.resolve(repairedProperty);
    }
  };
  const update = t.mock.method(Property, 'findOneAndUpdate', filter => {
    assert.equal(String(filter._id), propertyId);
    assert.equal(String(filter.tenantId), 'stale-tenant-id');
    return updateQuery;
  });
  const res = response();

  await getHandler('/my-rentals', 'get')({
    user: { _id: tenantId, name: 'Current tenant', role: 'tenant' }
  }, res);

  assert.equal(update.mock.callCount(), 1);
  assert.equal(res.body.count, 1);
  assert.equal(String(res.body.properties[0].tenantId), tenantId);
});

test('my-rentals does not repair a property when another tenant has the latest approval', async t => {
  const tenantId = 'tenant-id';
  const propertyId = 'property-two';
  const property = { _id: propertyId, tenantId: 'other-tenant-id', status: 'rented' };
  const propertyFilters = [];
  t.mock.method(Property, 'find', filter => {
    propertyFilters.push(filter);
    return {
      select() {
        if (propertyFilters.length === 1) return { sort: () => Promise.resolve([]) };
        return Promise.resolve([property]);
      }
    };
  });
  const requestFilters = [];
  t.mock.method(RentalRequest, 'find', filter => {
    requestFilters.push(filter);
    return {
      select() { return this; },
      sort() { return this; },
      lean() {
        return Promise.resolve(requestFilters.length === 1
          ? [{ propertyId }]
          : [{
              propertyId,
              tenantId: 'other-tenant-id',
              tenantName: 'Other tenant',
              updatedAt: new Date('2026-01-03')
            }]);
      }
    };
  });
  const update = t.mock.method(Property, 'findOneAndUpdate', () => {
    throw new Error('A newer tenant approval must prevent reassignment');
  });
  const res = response();

  await getHandler('/my-rentals', 'get')({ user: { _id: tenantId, role: 'tenant' } }, res);

  assert.equal(update.mock.callCount(), 0);
  assert.equal(res.body.count, 0);
});

test('my-rentals leaves an assignment unchanged when the current tenant name conflicts', async t => {
  const tenantId = 'tenant-id';
  const propertyId = 'property-two';
  const property = { _id: propertyId, tenantId: 'stale-tenant-id', tenantName: 'Other tenant', status: 'rented' };
  const propertyFilters = [];
  t.mock.method(Property, 'find', filter => {
    propertyFilters.push(filter);
    return {
      select() {
        if (propertyFilters.length === 1) return { sort: () => Promise.resolve([]) };
        return Promise.resolve([property]);
      }
    };
  });
  let requestFindCount = 0;
  t.mock.method(RentalRequest, 'find', () => {
    requestFindCount++;
    return {
      select() { return this; },
      sort() { return this; },
      lean() {
        return Promise.resolve([{
          propertyId,
          tenantId,
          tenantName: 'Current tenant',
          updatedAt: new Date('2026-01-03')
        }]);
      }
    };
  });
  const update = t.mock.method(Property, 'findOneAndUpdate', () => {
    throw new Error('A conflicting property tenant name must prevent reassignment');
  });
  const res = response();

  await getHandler('/my-rentals', 'get')({
    user: { _id: tenantId, name: 'Current tenant', role: 'tenant' }
  }, res);

  assert.equal(requestFindCount, 2);
  assert.equal(update.mock.callCount(), 0);
  assert.equal(res.body.count, 0);
});
