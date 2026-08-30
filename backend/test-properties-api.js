// Simple script to test /api/properties
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/properties',
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Count:', json.count);
      console.log('Properties:', Array.isArray(json.properties) ? json.properties.map(p => p.title || p._id) : json.properties);
    } catch (e) {
      console.error('Error parsing response:', e, data);
    }
  });
});

req.on('error', error => {
  console.error('Request error:', error);
});

req.end();
