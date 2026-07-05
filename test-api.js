
const testSite = {
  id: 'test-id-123',
  name: 'Test Hotel',
  group: 'Test Group',
  services: ['IPTV', 'HSIA'],
  ip: '192.168.1.1/ods/admin/',
  vpn: 'Test VPN',
  pms: 'Test PMS',
  hsia: 'Test HSIA',
  iptvSystem: 'Test IPTV',
  iptvUrl: 'https://test.com',
  castingUrl: 'https://test-casting.com',
  headend: 'Test Headend',
  headendUrl: 'https://test-headend.com',
  switches: 'Test Switch',
  wlanController: 'Test WLAN',
  wlanControllerUrl: 'https://test-wlan.com',
  notes: 'Test Notes',
  other: 'Test Other'
};

// Test POST (create site)
console.log('Testing POST /api/sites');
fetch('http://localhost:5176/api/sites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testSite)
})
  .then(res => {
    console.log('POST status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('POST response:', data);
    // Test GET
    console.log('\nTesting GET /api/sites');
    return fetch('http://localhost:5176/api/sites');
  })
  .then(res => {
    console.log('GET status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('GET response:', data);
    // Test DELETE
    console.log('\nTesting DELETE /api/sites/test-id-123');
    return fetch('http://localhost:5176/api/sites/test-id-123', {
      method: 'DELETE'
    });
  })
  .then(res => {
    console.log('DELETE status:', res.status);
    console.log('\nAll tests done!');
  })
  .catch(err => console.error('Error:', err));
