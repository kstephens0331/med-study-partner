/**
 * Monitor DxR case generation progress in real-time
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
  console.log('\n📊 DxR Case Generation Progress\n');
  console.log('Target: 1,500 total cases\n');

  // Get counts by difficulty
  const { data: cases, error } = await supabase
    .from('dxr_cases')
    .select('difficulty');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  const counts = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    expert: 0,
  };

  cases?.forEach((c) => {
    counts[c.difficulty as keyof typeof counts]++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  console.log(`${'='.repeat(60)}`);
  console.log(`📈 Total Cases: ${total} / 1,500 (${((total / 1500) * 100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  const targets = {
    beginner: 373,
    intermediate: 525,
    advanced: 450,
    expert: 152,
  };

  Object.entries(counts).forEach(([difficulty, count]) => {
    const target = targets[difficulty as keyof typeof targets];
    const percent = ((count / target) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / target * 40));
    const empty = '░'.repeat(40 - Math.floor(count / target * 40));

    console.log(`${difficulty.toUpperCase().padEnd(15)} ${count.toString().padStart(3)} / ${target} (${percent.padStart(5)}%)`);
    console.log(`  [${bar}${empty}]\n`);
  });

  // Check if any cases have image_generation_prompts
  const { data: withPrompts } = await supabase
    .from('dxr_cases')
    .select('id')
    .not('image_generation_prompts', 'is', null);

  const promptsCount = withPrompts?.length || 0;

  console.log(`${'='.repeat(60)}`);
  console.log(`🖼️  Cases with Image Prompts: ${promptsCount} / ${total} (${((promptsCount / total) * 100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  if (promptsCount < total) {
    console.log('⚠️  WARNING: Some cases missing image_generation_prompts!');
    console.log('   These cases were generated with the OLD system.\n');
  } else if (total > 0) {
    console.log('✅ All cases include image_generation_prompts for 100% accuracy!\n');
  }

  console.log('Run this script again to check updated progress.\n');
}

main().catch(console.error);
