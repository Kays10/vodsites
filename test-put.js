
const SUPABASE_URL = 'https://gbiuxqwayruyrenoynrf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaXV4cXdheXJ1eXJlbm95bnJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzIyOTcyMiwiZXhwIjoyMDk4ODA1NzIyfQ.OZ86bt1hsCuB_ULyqohN0vzKLFxZPQSf90xLBpfCCp8';

// Step 1: First POST a test site
console.log('Step 1: Creating test site via API...');
const testSiteId = 'test-put-' + Date.now();
const testSite = {
  id: testSiteId,
  name: 'PUT Test Site',
  group: 'Test',
  services: ['Service 1']
};

fetch('http://localhost:3000/api/sites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testSite)
}).then(r => r.json()).then(data => {
  console.log('POST OK:', data);
  console.log('\nStep 2: Updating test site via API...');
  return fetch(`http://localhost:3000/api/sites/${testSiteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...testSite, name: 'Updated PUT Test Site', group: 'Updated Test' })
  });
}).then(r => {
  console.log('PUT status:', r.status, r.statusText);
  if (!r.ok) {
    return r.text().then(text => { throw new Error(`PUT failed: ${text}`); });
  }
  return r.json();
}).then(data => {
  console.log('PUT OK:', data);
  console.log('✅ PUT test successful!');
}).catch(err => {
  console.error('❌ Error:', err);
});
