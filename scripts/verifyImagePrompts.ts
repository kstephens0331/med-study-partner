/**
 * Verify that generated DxR cases include image_generation_prompts
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
  console.log('\n🔍 Verifying Image Prompts in Generated DxR Cases...\n');

  // Fetch the most recent 2 cases
  const { data: cases, error } = await supabase
    .from('dxr_cases')
    .select('id, case_number, title, difficulty, image_generation_prompts')
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error('❌ Error fetching cases:', error);
    process.exit(1);
  }

  if (!cases || cases.length === 0) {
    console.log('❌ No cases found. Run generateDxRCases.ts first.');
    process.exit(1);
  }

  console.log(`✅ Found ${cases.length} recent cases\n`);

  for (const caseData of cases) {
    console.log(`${'='.repeat(80)}`);
    console.log(`📋 Case #${caseData.case_number}: ${caseData.title}`);
    console.log(`   Difficulty: ${caseData.difficulty}`);
    console.log(`${'='.repeat(80)}\n`);

    if (!caseData.image_generation_prompts) {
      console.log('❌ MISSING: image_generation_prompts field is NULL or empty\n');
      console.log('This case was generated with the OLD system and needs to be regenerated.\n');
      continue;
    }

    const prompts = caseData.image_generation_prompts as any;

    // Check patient photo prompt
    if (prompts.patient_photo) {
      console.log('✅ Patient Photo Prompt:');
      console.log(`   "${prompts.patient_photo}"\n`);
    } else {
      console.log('⚠️  Missing: patient_photo prompt\n');
    }

    // Check visual findings
    if (prompts.visual_findings && prompts.visual_findings.length > 0) {
      console.log(`✅ Visual Findings (${prompts.visual_findings.length}):`);
      prompts.visual_findings.forEach((finding: any, idx: number) => {
        console.log(`   ${idx + 1}. ${finding.finding_name} (${finding.finding_type})`);
        console.log(`      Location: ${finding.location}`);
        console.log(`      Requires: ${finding.requires_action}`);
        console.log(`      Key Finding: ${finding.is_key_finding ? 'Yes' : 'No'}`);
        console.log(`      SD Prompt: "${finding.sd_prompt.substring(0, 100)}..."\n`);
      });
    } else {
      console.log('⚠️  No visual findings (this is OK for cases without visible pathology)\n');
    }

    // Check radiology prompts
    if (prompts.radiology_prompts && prompts.radiology_prompts.length > 0) {
      console.log(`✅ Radiology Prompts (${prompts.radiology_prompts.length}):`);
      prompts.radiology_prompts.forEach((study: any, idx: number) => {
        console.log(`   ${idx + 1}. ${study.study_name} (${study.modality})`);
        console.log(`      Requires: ${study.requires_action}`);
        console.log(`      SD Prompt: "${study.sd_prompt.substring(0, 100)}..."\n`);
      });
    } else {
      console.log('⚠️  No radiology prompts\n');
    }

    // Check diagnostic prompts
    if (prompts.diagnostic_prompts && prompts.diagnostic_prompts.length > 0) {
      console.log(`✅ Diagnostic Prompts (${prompts.diagnostic_prompts.length}):`);
      prompts.diagnostic_prompts.forEach((test: any, idx: number) => {
        console.log(`   ${idx + 1}. ${test.test_name}`);
        console.log(`      Requires: ${test.requires_action}`);
        console.log(`      SD Prompt: "${test.sd_prompt.substring(0, 100)}..."\n`);
      });
    } else {
      console.log('⚠️  No diagnostic prompts (this is OK if no visual tests needed)\n');
    }
  }

  console.log(`${'='.repeat(80)}\n`);
  console.log('✅ Verification complete!\n');
  console.log('Next steps:');
  console.log('1. If image_generation_prompts are present → Generate all 1,500 cases');
  console.log('2. If missing → Check generateDxRCases.ts to ensure AI is creating prompts\n');
}

main().catch(console.error);
