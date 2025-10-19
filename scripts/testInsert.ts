/**
 * Test Insert to base_vignettes
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

console.log('Creating client with:');
console.log('URL:', SUPABASE_URL);
console.log('Service Role Key:', SUPABASE_SERVICE_ROLE?.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testInsert() {
  console.log('\n📝 Testing insert to base_vignettes...\n');

  const testVignette = {
    prompt: 'Test vignette',
    choices: [
      { label: 'A', text: 'Choice A' },
      { label: 'B', text: 'Choice B' },
      { label: 'C', text: 'Choice C' },
      { label: 'D', text: 'Choice D' },
      { label: 'E', text: 'Choice E' }
    ],
    correct_answer: 'A',
    explanation: 'Test explanation',
    system: 'heme',
    topic: 'test',
    difficulty: 'easy'
  };

  const { data, error } = await supabase
    .from('base_vignettes')
    .insert(testVignette)
    .select();

  if (error) {
    console.error('❌ Insert failed:');
    console.error('Error:', error);
    console.error('Code:', error.code);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
    console.error('Message:', error.message);
  } else {
    console.log('✅ Insert successful!');
    console.log('Data:', data);

    // Clean up - delete the test record
    if (data && data[0]) {
      const { error: deleteError } = await supabase
        .from('base_vignettes')
        .delete()
        .eq('id', data[0].id);

      if (!deleteError) {
        console.log('✅ Test record cleaned up');
      }
    }
  }
}

testInsert().catch(console.error);
