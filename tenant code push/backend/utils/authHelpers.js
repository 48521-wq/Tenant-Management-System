const crypto = require('crypto');

const HTML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => HTML_ESCAPE[char]);
}

module.exports = { generateOTP, escapeHtml };
