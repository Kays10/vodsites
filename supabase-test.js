
// Test script to verify Supabase connection and delete functionality
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gbiuxqwayruyrenoynrf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaXV4cXdheXJ1eXJlbm95bnJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzIyOTcyMiwiZXhwIjoyMDk4ODA1NzIyfQ.OZ86bt1hsCuB_ULyqohN0vzKLFxZPQSf90xLBpfCCp8';

console.log('=== Starting Supabase test ===');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testSupabase() {
  try {
    console.log('\n1. Fetching all sites...');
    const { data: sites, error: fetchError } = await supabase.from('sites').select('*').limit(5);
    if (fetchError) throw fetchError;
    console.log('✅ Fetched sites:', sites.map(s => ({ id: s.id, name: s.name })));

    if (sites && sites.length > 0) {
      console.log('\n2. Creating a test site...');
      const testId = 'test-delete-' + Date.now();
      const testSite = {
        id: testId,
        name: 'Test Delete Site - ' + new Date().toISOString(),
        group: 'Test',
        services: ['Test Service']
      };

      const { data: createdSite, error: insertError } = await supabase.from('sites').insert([testSite]).select();
      if (insertError) throw insertError;
      console.log('✅ Created test site:', createdSite);

      console.log('\n3. Deleting test site with id:', testId);
      const { data: deletedData, error: deleteError, count } = await supabase
        .from('sites')
        .delete({ count: 'exact' })
        .eq('id', testId);

      if (deleteError) throw deleteError;
      console.log('✅ Delete response:');
      console.log('  data:', deletedData);
      console.log('  count:', count);

      console.log('\n4. Verifying site is gone...');
      const { data: verifySite, error: verifyError } = await supabase.from('sites').select('*').eq('id', testId).maybeSingle();
      if (verifyError) throw verifyError;
      console.log('  Verify result:', verifySite);
      console.log('✅ Site is deleted:', !verifySite);
    }

    console.log('\n=== All tests passed! Supabase delete works perfectly! ===');
  } catch (err) {
    console.error('\n=== ERROR! ===');
    console.error('  Error:', err);
  }
}

testSupabase();

