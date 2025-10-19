/**
 * Generate All Systems to 500 Vignettes Each
 *
 * Automatically completes all 13 systems sequentially
 * Target: 6,500 total vignettes (13 × 500)
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SYSTEMS = [
  'renal',
  'heme',
  'cards',
  'neuro',
  'pulm',
  'endo',
  'gi',
  'micro',
  'pharm',
  'genetics',
  'obgyn',
  'psych',
  'peds'
];

async function generateAllSystems() {
  console.log('\n🚀 Starting Complete Vignette Generation');
  console.log('Target: 6,500 vignettes (13 systems × 500 each)');
  console.log('='.repeat(80));

  const startTime = Date.now();
  let completedSystems = 0;

  for (let i = 0; i < SYSTEMS.length; i++) {
    const system = SYSTEMS[i];
    console.log(`\n[${i + 1}/${SYSTEMS.length}] Processing ${system}...`);
    console.log('-'.repeat(80));

    try {
      execSync(`npx tsx scripts/completeSystem.ts --system=${system}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      completedSystems++;
      console.log(`\n✅ ${system} complete! (${completedSystems}/${SYSTEMS.length} systems done)`);
    } catch (error: any) {
      console.error(`\n❌ Error completing ${system}: ${error.message}`);
      console.log('Continuing to next system...');
    }

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const avgTimePerSystem = elapsed / completedSystems;
    const remaining = SYSTEMS.length - completedSystems;
    const estimatedTimeLeft = avgTimePerSystem * remaining;

    console.log(`\n📊 Overall Progress: ${completedSystems}/${SYSTEMS.length} systems complete`);
    console.log(`⏱️  Elapsed: ${elapsed.toFixed(1)} minutes`);
    console.log(`⏱️  Estimated time remaining: ${estimatedTimeLeft.toFixed(1)} minutes (~${(estimatedTimeLeft/60).toFixed(1)} hours)`);
    console.log('='.repeat(80));
  }

  console.log('\n🎉 ALL SYSTEMS COMPLETE!');
  console.log(`✅ Completed ${completedSystems}/${SYSTEMS.length} systems`);
  console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);
  console.log('\nRun validation: npx tsx scripts/validateVignettes.ts\n');
}

generateAllSystems().catch(console.error);
