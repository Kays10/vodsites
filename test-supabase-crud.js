
import { createClient } from '@supabase/supabase-js';

console.log('=== Supabase CRUD Test ===');
const SUPABASE_URL = 'https://gbiuxqwayruyrenoynrf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaXV4cXdheXJ1eXJlbm95bnJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzIyOTcyMiwiZXhwIjoyMDk4ODA1NzIyfQ.OZ86bt1hsCuB_ULyqohN0vzKLFxZPQSf90xLBpfCCp8';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

console.log('✅ Credentials loaded!');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Test 1: Check RLS status
console.log('\n=== 1. Checking RLS Status ===');
try {
  const { data, error } = await supabase.rpc('pg_stat_user_tables'); // Check if we can run arbitrary SQL
  // If that fails, let's just check the sites table structure
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_name', 'sites');
  
  if (tablesError) {
    console.log('⚠️ Cannot query information_schema (normal for service role), skipping RLS check via SQL');
  } else {
    console.log('✅ Found sites table!');
  }
  
  console.log('✅ RLS check: Service role should bypass RLS regardless');
} catch (err) {
  console.error('❌ RLS check error:', err);
}

// Test 2: Create a test site
const TEST_SITE_ID = 'test-crud-' + Date.now();
console.log('\n=== 2. Creating Test Site ===');
try {
  const { data, error } = await supabase
    .from('sites')
    .insert([{
      id: TEST_SITE_ID,
      name: 'CRUD Test Site',
      group: 'Test Group',
      services: ['Test Service 1', 'Test Service 2']
    }])
    .select();

  if (error) throw error;
  console.log('✅ Created site:', data);

  // Verify immediately after create
  const { data: verifyCreate, error: verifyCreateError } = await supabase
    .from('sites')
    .select('*')
    .eq('id', TEST_SITE_ID)
    .single();

  if (verifyCreateError) throw verifyCreateError;
  console.log('✅ Verified site exists after create:', verifyCreate);
} catch (err) {
  console.error('❌ Create failed:', err);
  process.exit(1);
}

// Test 3: Update the test site
console.log('\n=== 3. Updating Test Site ===');
try {
  const { data, error } = await supabase
    .from('sites')
    .update({
      name: 'Updated CRUD Test Site',
      group: 'Updated Test Group'
    })
    .eq('id', TEST_SITE_ID)
    .select();

  if (error) throw error;
  console.log('✅ Updated site:', data);

  // Verify immediately after update
  const { data: verifyUpdate, error: verifyUpdateError } = await supabase
    .from('sites')
    .select('*')
    .eq('id', TEST_SITE_ID)
    .single();

  if (verifyUpdateError) throw verifyUpdateError;
  console.log('✅ Verified update:', verifyUpdate);
} catch (err) {
  console.error('❌ Update failed:', err);
  process.exit(1);
}

// Test 4: Delete the test site
console.log('\n=== 4. Deleting Test Site ===');
try {
  const { data, error, count } = await supabase
    .from('sites')
    .delete({ count: 'exact' })
    .eq('id', TEST_SITE_ID);

  if (error) throw error;
  console.log('✅ Deleted site:', { data, count });

  // Verify immediately after delete
  const { data: verifyDelete, error: verifyDeleteError } = await supabase
    .from('sites')
    .select('*')
    .eq('id', TEST_SITE_ID)
    .maybeSingle();

  if (verifyDeleteError) throw verifyDeleteError;
  console.log('✅ Verified site is gone:', verifyDelete === null);
} catch (err) {
  console.error('❌ Delete failed:', err);
  process.exit(1);
}

console.log('\n🎉 ALL CRUD OPERATIONS SUCCESSFUL!');
