const test = require('node:test');
const assert = require('node:assert/strict');
const { generateOTP, escapeHtml } = require('../utils/authHelpers');

test('generateOTP returns a six-digit decimal code', () => {
  for (let i = 0; i < 100; i++) {
    const otp = generateOTP();
    assert.match(otp, /^\d{6}$/);
    assert.ok(Number(otp) >= 100000 && Number(otp) < 1000000);
  }
});

test('escapeHtml encodes characters that can change HTML markup', () => {
  assert.equal(escapeHtml(`<script a="b">O'Neil & Co</script>`),
    '&lt;script a=&quot;b&quot;&gt;O&#39;Neil &amp; Co&lt;/script&gt;');
  assert.equal(escapeHtml(null), '');
});
