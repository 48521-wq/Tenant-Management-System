const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/leaseAgreements');
const LeaseAgreement = require('../models/LeaseAgreement');

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

test('tenant my-agreements only returns leases sent to the tenant', async t => {
  const tenantId = 'tenant-id';
  const leases = [{ _id: 'lease-one' }, { _id: 'lease-two' }];
  const query = {
    sort(sort) {
      assert.deepEqual(sort, { createdAt: -1 });
      return Promise.resolve(leases);
    }
  };
  t.mock.method(LeaseAgreement, 'find', filter => {
    assert.deepEqual(filter, {
      tenantId,
      status: { $in: ['sent', 'signed'] }
    });
    return query;
  });
  const res = response();

  await getHandler('/my', 'get')({ user: { _id: tenantId, role: 'tenant' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.leases, leases);
});
