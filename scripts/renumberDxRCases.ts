/**
 * Renumber existing DxR cases to use difficulty-based ranges
 *
 * New numbering system:
 * - Beginner: 1000-1999 (1xxx series)
 * - Intermediate: 2000-2999 (2xxx series)
 * - Advanced: 3000-3999 (3xxx series)
 * - Expert: 4000-4999 (4xxx series)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const CASE_NUMBER_RANGES = {
  beginner: { start: 1000, end: 1999 },
  intermediate: { start: 2000, end: 2999 },
  advanced: { start: 3000, end: 3999 },
  expert: { start: 4000, end: 4999 }
};

async function renumberCases() {
  console.log('\n🔢 Renumbering DxR cases to use difficulty-based ranges...\n');

  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];

  for (const difficulty of difficulties) {
    console.log(`\n📋 Processing ${difficulty} cases...`);

    // Get all cases for this difficulty, ordered by current case_number
    const { data: cases, error } = await supabase
      .from('dxr_cases')
      .select('id, case_number, difficulty')
      .eq('difficulty', difficulty)
      .order('case_number', { ascending: true });

    if (error) {
      console.error(`❌ Error fetching ${difficulty} cases:`, error.message);
      continue;
    }

    if (!cases || cases.length === 0) {
      console.log(`   No ${difficulty} cases found, skipping...`);
      continue;
    }

    console.log(`   Found ${cases.length} ${difficulty} cases`);

    const range = CASE_NUMBER_RANGES[difficulty as keyof typeof CASE_NUMBER_RANGES];
    let updated = 0;
    let failed = 0;

    // Renumber each case
    for (let i = 0; i < cases.length; i++) {
      const newCaseNumber = range.start + i;
      const oldCaseNumber = cases[i].case_number;

      if (oldCaseNumber === newCaseNumber) {
        console.log(`   Case ${cases[i].id}: Already numbered ${newCaseNumber}, skipping`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('dxr_cases')
        .update({ case_number: newCaseNumber })
        .eq('id', cases[i].id);

      if (updateError) {
        console.error(`   ❌ Failed to update case ${cases[i].id}: ${updateError.message}`);
        failed++;
      } else {
        console.log(`   ✅ Case ${cases[i].id}: ${oldCaseNumber} → ${newCaseNumber}`);
        updated++;
      }
    }

    console.log(`\n   Summary: ${updated} updated, ${failed} failed, ${cases.length - updated - failed} unchanged`);
  }

  console.log('\n✅ Renumbering complete!\n');
}

renumberCases().catch(console.error);
