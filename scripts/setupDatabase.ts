/**
 * Setup Database Tables
 *
 * Creates base_vignettes table directly using service role
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function setupTables() {
  console.log('🚀 Setting up base_vignettes table...\n');

  // Check if table exists
  const { data: existingTable, error: checkError } = await supabase
    .from('base_vignettes')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Table base_vignettes already exists!');
    console.log(`   Current row count: Checking...`);

    const { count, error: countError } = await supabase
      .from('base_vignettes')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`   ✅ base_vignettes has ${count} rows`);
    }

    return;
  }

  console.log('⚠️  Table does not exist or cannot be accessed.');
  console.log('\nTo create the table, please run this SQL in Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/bqnmswxuzfguxrfgulps/sql/new\n');
  console.log('Copy from: supabase/migrations/20250120000000_add_base_vignettes.sql\n');
}

setupTables().catch(console.error);
