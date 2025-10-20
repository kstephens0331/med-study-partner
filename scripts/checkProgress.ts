/**
 * Check Vignette Generation Progress
 *
 * Monitors the base_vignettes table to show generation progress
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
    persistSession: false
  }
});

const SYSTEMS = [
  { id: 'heme', name: 'Hematology', target: 500 },
  { id: 'renal', name: 'Renal', target: 500 },
  { id: 'cards', name: 'Cardiology', target: 500 },
  { id: 'neuro', name: 'Neurology', target: 500 },
  { id: 'pulm', name: 'Pulmonology', target: 500 },
  { id: 'endo', name: 'Endocrinology', target: 500 },
  { id: 'gi', name: 'Gastroenterology', target: 500 },
  { id: 'micro', name: 'Microbiology', target: 500 },
  { id: 'pharm', name: 'Pharmacology', target: 500 },
  { id: 'genetics', name: 'Genetics', target: 500 },
  { id: 'obgyn', name: 'OB/GYN', target: 500 },
  { id: 'psych', name: 'Psychiatry', target: 500 },
  { id: 'peds', name: 'Pediatrics', target: 500 }
];

async function checkProgress() {
  console.log('\n📊 Vignette Generation Progress Report\n');
  console.log(`Generated at: ${new Date().toLocaleString()}\n`);
  console.log('='.repeat(80));

  let totalGenerated = 0;
  const targetTotal = 6500;

  for (const system of SYSTEMS) {
    const { count, error } = await supabase
      .from('base_vignettes')
      .select('*', { count: 'exact', head: true })
      .eq('system', system.id);

    if (error) {
      console.log(`❌ ${system.name}: Error fetching count - ${error.message}`);
      continue;
    }

    const current = count || 0;
    totalGenerated += current;
    const progress = ((current / system.target) * 100).toFixed(1);
    const barLength = Math.min(40, Math.floor(current / system.target * 40));
    const bar = '█'.repeat(Math.max(0, barLength));
    const empty = '░'.repeat(Math.max(0, 40 - barLength));

    const status = current >= system.target ? '✅' : current > 0 ? '🔄' : '⏳';

    console.log(`${status} ${system.name.padEnd(20)} [${bar}${empty}] ${current}/${system.target} (${progress}%)`);
  }

  console.log('='.repeat(80));
  console.log(`\n📈 Total Progress: ${totalGenerated}/${targetTotal} vignettes (${((totalGenerated/targetTotal)*100).toFixed(1)}%)\n`);

  // Show breakdown by difficulty
  const { data: difficultyBreakdown } = await supabase
    .from('base_vignettes')
    .select('difficulty');

  if (difficultyBreakdown) {
    const easy = difficultyBreakdown.filter(v => v.difficulty === 'easy').length;
    const moderate = difficultyBreakdown.filter(v => v.difficulty === 'moderate').length;
    const hard = difficultyBreakdown.filter(v => v.difficulty === 'hard').length;

    console.log('Difficulty Distribution:');
    console.log(`  Easy:     ${easy} (${((easy/totalGenerated)*100).toFixed(1)}%)`);
    console.log(`  Moderate: ${moderate} (${((moderate/totalGenerated)*100).toFixed(1)}%)`);
    console.log(`  Hard:     ${hard} (${((hard/totalGenerated)*100).toFixed(1)}%)`);
  }

  console.log('\n');

  // Estimate time remaining (if in progress)
  if (totalGenerated > 0 && totalGenerated < targetTotal) {
    const { data: firstVignette } = await supabase
      .from('base_vignettes')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstVignette) {
      const startTime = new Date(firstVignette.created_at).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const rate = totalGenerated / (elapsed / 1000 / 60); // vignettes per minute
      const remaining = targetTotal - totalGenerated;
      const estimatedMinutes = remaining / rate;
      const estimatedHours = (estimatedMinutes / 60).toFixed(1);

      console.log(`⏱️  Estimated time remaining: ~${estimatedHours} hours`);
      console.log(`📊 Generation rate: ${rate.toFixed(2)} vignettes/minute\n`);
    }
  }

  if (totalGenerated >= targetTotal) {
    console.log('🎉 GENERATION COMPLETE! All 4,550 vignettes have been generated.\n');
    return true; // Complete
  }

  return false; // Still in progress
}

checkProgress().catch(console.error);
