/**
 * Delete all DxR cases
 * USE WITH CAUTION - This will delete all cases and start fresh
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('\n⚠️  WARNING: This will delete ALL DxR cases!');
  console.log('');

  // Count existing cases
  const { count } = await supabase
    .from('dxr_cases')
    .select('*', { count: 'exact', head: true });

  if (!count || count === 0) {
    console.log('No DxR cases found. Nothing to delete.');
    return;
  }

  console.log(`Found ${count} DxR cases to delete.`);
  console.log('');
  console.log('Deleting in 3 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Delete all cases
  const { error } = await supabase.from('dxr_cases').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('❌ Error deleting cases:', error);
    process.exit(1);
  }

  console.log(`✅ Deleted ${count} DxR cases successfully!`);
  console.log('');
  console.log('You can now regenerate cases with image prompts included.');
}

main().catch(console.error);
