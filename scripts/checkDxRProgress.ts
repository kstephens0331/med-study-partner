/**
 * Check DxR Case Generation Progress
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

const DIFFICULTY_DISTRIBUTION = {
  beginner: 375,      // 25%
  intermediate: 525,  // 35%
  advanced: 450,      // 30%
  expert: 150         // 10%
};

async function checkProgress() {
  console.log('\n📊 DxR Case Generation Progress\n');
  console.log('='.repeat(80));

  let totalCases = 0;
  const targetTotal = 1500;

  for (const [difficulty, target] of Object.entries(DIFFICULTY_DISTRIBUTION)) {
    const { count, error } = await supabase
      .from('dxr_cases')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', difficulty);

    if (error) {
      console.error(`\n❌ Error checking ${difficulty}:`, error);
      continue;
    }

    const current = count || 0;
    totalCases += current;

    const percentage = Math.round((current / target) * 100);
    const barLength = Math.min(40, Math.floor(current / target * 40));
    const bar = '█'.repeat(Math.max(0, barLength)) + '░'.repeat(Math.max(0, 40 - barLength));

    console.log(`\n${difficulty.toUpperCase().padEnd(15)} [${bar}] ${percentage}%`);
    console.log(`${current.toString().padStart(4)}/${target} cases`);
  }

  console.log('\n' + '='.repeat(80));
  const totalPercentage = Math.round((totalCases / targetTotal) * 100);
  const totalBar = '█'.repeat(Math.floor(totalCases / targetTotal * 40)) + '░'.repeat(40 - Math.floor(totalCases / targetTotal * 40));
  console.log(`\nTOTAL           [${totalBar}] ${totalPercentage}%`);
  console.log(`${totalCases}/${targetTotal} cases\n`);

  if (totalCases >= targetTotal) {
    console.log('✅ All DxR cases generated!\n');
  } else {
    console.log(`🎯 ${targetTotal - totalCases} cases remaining\n`);
  }
}

checkProgress().catch(console.error);
