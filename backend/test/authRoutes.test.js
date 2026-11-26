const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/auth');
const PendingSignup = require('../models/PendingSignup');
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

test('pending signups do not persist a plaintext password', () => {
  assert.equal(PendingSignup.schema.path('userData.password'), undefined);
});

test('OTP verification uses the password submitted by the user', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const record = {
    _id: 'pending-signup-id',
    otp: '123456',
    expiresAt: new Date(Date.now() + 60_000),
    userData: { name: 'Test Tenant', email: 'tenant@example.com', role: 'tenant' }
  };
  t.mock.method(PendingSignup, 'findOne', async filter => {
    assert.deepEqual(filter, { email: 'tenant@example.com' });
    return record;
  });
  t.mock.method(PendingSignup, 'findOneAndDelete', async filter => {
    assert.deepEqual(filter, { _id: record._id, otp: '123456' });
    return record;
  });
  const createUser = t.mock.method(User, 'create', async userData => {
    assert.equal(userData.password, 'secret-password');
    return {
      _id: 'user-id',
      name: userData.name,
      email: userData.email,
      role: userData.role,
      status: 'active',
      verified: true,
      createdAt: new Date()
    };
  });
  const res = response();

  await getHandler('/verify-otp', 'post')({
    body: { email: 'tenant@example.com', otp: '123456', password: 'secret-password' }
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(createUser.mock.callCount(), 1);
});
