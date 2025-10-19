/**
 * Validate Generated Vignettes
 *
 * Checks database for completeness and quality
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
  { id: 'heme', name: 'Hematology', target: 350 },
  { id: 'renal', name: 'Renal', target: 350 },
  { id: 'cards', name: 'Cardiology', target: 350 },
  { id: 'neuro', name: 'Neurology', target: 350 },
  { id: 'pulm', name: 'Pulmonology', target: 350 },
  { id: 'endo', name: 'Endocrinology', target: 350 },
  { id: 'gi', name: 'Gastroenterology', target: 350 },
  { id: 'micro', name: 'Microbiology', target: 350 },
  { id: 'pharm', name: 'Pharmacology', target: 350 },
  { id: 'genetics', name: 'Genetics', target: 350 },
  { id: 'obgyn', name: 'OB/GYN', target: 350 },
  { id: 'psych', name: 'Psychiatry', target: 350 },
  { id: 'peds', name: 'Pediatrics', target: 350 }
];

async function validate() {
  console.log('\n🔍 Vignette Database Validation\n');
  console.log('='.repeat(80));

  // Get total count
  const { count: totalCount, error: totalError } = await supabase
    .from('base_vignettes')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error fetching total count:', totalError.message);
    return;
  }

  console.log(`\n📊 Total Vignettes: ${totalCount}/4550 (${((totalCount || 0)/4550*100).toFixed(1)}%)\n`);

  // Get breakdown by system and difficulty
  const { data: allVignettes, error: dataError } = await supabase
    .from('base_vignettes')
    .select('system, difficulty');

  if (dataError) {
    console.error('❌ Error fetching vignette data:', dataError.message);
    return;
  }

  if (!allVignettes) {
    console.error('❌ No vignettes found in database');
    return;
  }

  console.log('System Breakdown:\n');
  console.log('System              | Easy  | Mod   | Hard  | Total | Target | % Complete');
  console.log('-'.repeat(80));

  let needsGeneration: Array<{system: string, difficulty: string, needed: number}> = [];

  for (const system of SYSTEMS) {
    const systemVignettes = allVignettes.filter(v => v.system === system.id);
    const easy = systemVignettes.filter(v => v.difficulty === 'easy').length;
    const moderate = systemVignettes.filter(v => v.difficulty === 'moderate').length;
    const hard = systemVignettes.filter(v => v.difficulty === 'hard').length;
    const total = systemVignettes.length;
    const percent = ((total / system.target) * 100).toFixed(1);

    const status = total >= system.target ? '✅' : total > 0 ? '⚠️ ' : '❌';

    console.log(
      `${status} ${system.name.padEnd(17)} | ${easy.toString().padStart(5)} | ${moderate.toString().padStart(5)} | ${hard.toString().padStart(5)} | ${total.toString().padStart(5)} | ${system.target.toString().padStart(6)} | ${percent.padStart(6)}%`
    );

    // Calculate what's needed (30% easy, 50% moderate, 20% hard)
    const targetEasy = Math.floor(system.target * 0.3);
    const targetModerate = Math.floor(system.target * 0.5);
    const targetHard = Math.floor(system.target * 0.2);

    if (easy < targetEasy) {
      needsGeneration.push({ system: system.id, difficulty: 'easy', needed: targetEasy - easy });
    }
    if (moderate < targetModerate) {
      needsGeneration.push({ system: system.id, difficulty: 'moderate', needed: targetModerate - moderate });
    }
    if (hard < targetHard) {
      needsGeneration.push({ system: system.id, difficulty: 'hard', needed: targetHard - hard });
    }
  }

  console.log('='.repeat(80));

  // Overall difficulty distribution
  const easyTotal = allVignettes.filter(v => v.difficulty === 'easy').length;
  const moderateTotal = allVignettes.filter(v => v.difficulty === 'moderate').length;
  const hardTotal = allVignettes.filter(v => v.difficulty === 'hard').length;

  console.log('\n📈 Overall Difficulty Distribution:\n');
  console.log(`  Easy:     ${easyTotal.toString().padStart(4)} (${((easyTotal/(totalCount||1))*100).toFixed(1)}%) - Target: 30%`);
  console.log(`  Moderate: ${moderateTotal.toString().padStart(4)} (${((moderateTotal/(totalCount||1))*100).toFixed(1)}%) - Target: 50%`);
  console.log(`  Hard:     ${hardTotal.toString().padStart(4)} (${((hardTotal/(totalCount||1))*100).toFixed(1)}%) - Target: 20%`);

  // What still needs to be generated
  if (needsGeneration.length > 0) {
    console.log('\n\n⚠️  INCOMPLETE - Additional vignettes needed:\n');

    const grouped = needsGeneration.reduce((acc, item) => {
      if (!acc[item.system]) acc[item.system] = {};
      acc[item.system][item.difficulty] = item.needed;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    for (const [sys, diffs] of Object.entries(grouped)) {
      const sysName = SYSTEMS.find(s => s.id === sys)?.name || sys;
      console.log(`  ${sysName}:`);
      if (diffs.easy) console.log(`    - ${diffs.easy} easy vignettes`);
      if (diffs.moderate) console.log(`    - ${diffs.moderate} moderate vignettes`);
      if (diffs.hard) console.log(`    - ${diffs.hard} hard vignettes`);
    }

    const totalNeeded = needsGeneration.reduce((sum, item) => sum + item.needed, 0);
    console.log(`\n  Total additional vignettes needed: ${totalNeeded}`);
  } else {
    console.log('\n\n✅ COMPLETE - All 4,550 vignettes generated!\n');
  }

  // Sample validation - check 5 random vignettes
  console.log('\n🔍 Sample Quality Check (5 random vignettes):\n');

  const { data: samples } = await supabase
    .from('base_vignettes')
    .select('id, system, difficulty, prompt, choices, correct_answer, explanation')
    .limit(5);

  if (samples) {
    for (const sample of samples) {
      const hasPrompt = sample.prompt && sample.prompt.length > 50;
      const hasChoices = Array.isArray(sample.choices) && sample.choices.length === 5;
      const hasAnswer = sample.correct_answer && ['A', 'B', 'C', 'D', 'E'].includes(sample.correct_answer);
      const hasExplanation = sample.explanation && sample.explanation.length > 50;

      const status = hasPrompt && hasChoices && hasAnswer && hasExplanation ? '✅' : '⚠️ ';
      console.log(`${status} ${sample.system}:${sample.difficulty} - ID: ${sample.id.substring(0, 8)}...`);

      if (!hasPrompt) console.log('    ⚠️  Prompt too short or missing');
      if (!hasChoices) console.log('    ⚠️  Invalid choices format');
      if (!hasAnswer) console.log('    ⚠️  Invalid answer');
      if (!hasExplanation) console.log('    ⚠️  Explanation too short or missing');
    }
  }

  console.log('\n');
}

validate().catch(console.error);
