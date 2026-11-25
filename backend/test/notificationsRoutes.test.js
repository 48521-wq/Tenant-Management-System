const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/notifications');
const Notification = require('../models/Notification');
const Property = require('../models/Property');

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

test('a landlord does not see another landlord-wide notification', async t => {
  t.mock.method(Notification, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() {
      return Promise.resolve([{
        _id: 'old-notification',
        title: 'Old landlord message',
        message: 'For old landlord tenants',
        color: 'gold',
        fromName: 'Old Landlord',
        fromEmail: 'old@example.com',
        fromRole: 'landlord',
        to: ['all'],
        toLabel: 'Everyone',
        readBy: [],
        createdAt: new Date()
      }]);
    }
  }));

  const res = response();
  await getHandler('/', 'get')({
    user: {
      role: 'landlord',
      email: 'new@example.com',
      name: 'New Landlord'
    }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 0);
  assert.deepEqual(res.body.notifications, []);
});

test('a tenant only sees notifications created after their account', async t => {
  t.mock.method(Property, 'find', () => ({
    populate() { return this; },
    select() { return Promise.resolve([]); }
  }));
  t.mock.method(Notification, 'find', () => ({
    select() { return this; },
    sort() { return this; },
    limit() {
      return Promise.resolve([{
        _id: 'old-admin',
        title: 'Old admin message',
        message: 'sent before registration',
        color: 'red',
        fromName: 'Admin',
        fromEmail: 'admin@example.com',
        fromRole: 'admin',
        to: ['all'],
        readBy: [],
        createdAt: new Date('2026-01-01')
      }]);
    }
  }));

  const res = response();
  await getHandler('/', 'get')({
    user: {
      _id: 'new-tenant',
      role: 'tenant',
      email: 'new-tenant@example.com',
      name: 'New Tenant',
      createdAt: new Date('2026-02-01')
    }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 0);
});
