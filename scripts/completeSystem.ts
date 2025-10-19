/**
 * Complete Vignette Generation for Single System
 *
 * Checks existing vignettes and only generates what's missing to avoid duplicates
 * Usage: npx tsx scripts/completeSystem.ts --system=heme
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SYSTEMS: Record<string, { name: string, topics: string[] }> = {
  'heme': { name: 'Hematology', topics: ['iron-deficiency', 'hemophilia', 'vwd', 'itp', 'thalassemia', 'sickle-cell', 'polycythemia', 'leukemia-acute', 'leukemia-chronic', 'lymphoma'] },
  'renal': { name: 'Renal', topics: ['aki', 'ckd', 'dka', 'hhs', 'rta', 'nephrotic-syndrome', 'nephritic-syndrome', 'uti', 'pyelonephritis', 'electrolytes'] },
  'cards': { name: 'Cardiology', topics: ['acs', 'stemi', 'nstemi', 'heart-failure', 'afib', 'vt', 'pericarditis', 'endocarditis', 'valvular', 'hypertension'] },
  'neuro': { name: 'Neurology', topics: ['stroke-ischemic', 'stroke-hemorrhagic', 'tia', 'seizure', 'meningitis', 'encephalitis', 'multiple-sclerosis', 'parkinsons', 'alzheimers', 'headache'] },
  'pulm': { name: 'Pulmonology', topics: ['asthma', 'copd', 'pneumonia', 'tb', 'pe', 'ards', 'lung-cancer', 'pleural-effusion', 'pneumothorax', 'ild'] },
  'endo': { name: 'Endocrinology', topics: ['graves', 'hashimoto', 'thyroid-cancer', 'dm-type1', 'dm-type2', 'addison', 'cushing', 'pheochromocytoma', 'hyperparathyroid', 'osteoporosis'] },
  'gi': { name: 'Gastroenterology', topics: ['gerd', 'pud', 'gi-bleed', 'ibd-crohns', 'ibd-uc', 'cirrhosis', 'hepatitis', 'pancreatitis', 'cholecystitis', 'appendicitis'] },
  'micro': { name: 'Microbiology', topics: ['sepsis', 'meningitis-bacterial', 'meningitis-viral', 'pneumonia-cap', 'pneumonia-hap', 'hiv', 'opportunistic-infections', 'sti', 'skin-infections', 'osteomyelitis'] },
  'pharm': { name: 'Pharmacology', topics: ['acetaminophen-toxicity', 'salicylate-toxicity', 'opioid-overdose', 'warfarin-management', 'serotonin-syndrome', 'nms', 'malignant-hyperthermia', 'drug-interactions', 'adrs', 'chemo-complications'] },
  'genetics': { name: 'Genetics', topics: ['down-syndrome', 'turner-syndrome', 'klinefelter', 'cystic-fibrosis', 'sickle-cell-genetics', 'hemophilia-genetics', 'huntington', 'fragile-x', 'brca', 'lynch-syndrome'] },
  'obgyn': { name: 'OB/GYN', topics: ['preeclampsia', 'eclampsia', 'hellp', 'ectopic-pregnancy', 'placenta-previa', 'placental-abruption', 'pid', 'ovarian-torsion', 'pcos', 'endometriosis'] },
  'psych': { name: 'Psychiatry', topics: ['mdd', 'bipolar', 'schizophrenia', 'gad', 'panic-disorder', 'ocd', 'ptsd', 'anorexia', 'bulimia', 'alcohol-withdrawal'] },
  'peds': { name: 'Pediatrics', topics: ['vsd', 'asd', 'tof', 'coarctation', 'kawasaki', 'croup', 'epiglottitis', 'bronchiolitis', 'intussusception', 'child-abuse'] }
};

const VIGNETTE_GENERATION_PROMPT = (system: string, topic: string, difficulty: string, count: number) => `
Generate ${count} USMLE Step 2 CK style clinical vignettes for ${system} focusing on ${topic} at ${difficulty} difficulty level.

CRITICAL REQUIREMENTS:
1. Each vignette MUST be a complete clinical scenario (150-250 words)
2. Include realistic patient demographics, history, physical exam findings
3. Include relevant lab values and vital signs where appropriate
4. Provide exactly 5 answer choices (A through E)
5. Include a detailed explanation (100+ words) with pathophysiology
6. For differential diagnosis topics, include a comparison table

Return ONLY valid JSON in this exact format:
{
  "vignettes": [
    {
      "prompt": "A detailed 2-3 paragraph clinical vignette...",
      "labs": [
        {"test": "Hemoglobin", "result": "8.2 g/dL", "referenceRange": "13.5-17.5 g/dL"},
        {"test": "MCV", "result": "68 fL", "referenceRange": "80-100 fL"}
      ],
      "vitals": {
        "BP": "110/70 mmHg",
        "HR": "88 bpm",
        "Temp": "98.6°F",
        "RR": "16/min",
        "O2Sat": "98% on RA"
      },
      "choices": [
        {"label": "A", "text": "First answer choice"},
        {"label": "B", "text": "Second answer choice"},
        {"label": "C", "text": "Third answer choice"},
        {"label": "D", "text": "Fourth answer choice"},
        {"label": "E", "text": "Fifth answer choice"}
      ],
      "correct_answer": "A",
      "explanation": "Detailed explanation discussing pathophysiology, why the correct answer is right, and why other options are incorrect...",
      "comparison_table": {
        "title": "Differential Diagnosis Comparison",
        "headers": ["Feature", "Option A", "Option B", "Option C"],
        "rows": [
          {"Feature": "Key Finding", "Option A": "Present", "Option B": "Absent", "Option C": "Variable"}
        ]
      },
      "topic": "${topic}",
      "difficulty": "${difficulty}"
    }
  ]
}
`;

async function generateVignettesWithAI(
  system: string,
  topic: string,
  difficulty: string,
  count: number
): Promise<any[]> {
  const prompt = VIGNETTE_GENERATION_PROMPT(system, topic, difficulty, count);

  console.log(`    Generating ${count} ${difficulty} vignettes for ${topic}...`);

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert USMLE question writer. You ONLY respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    console.error(`      ❌ API error: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);
    return parsed.vignettes || [];
  } catch (e) {
    console.error('      ❌ Failed to parse JSON response');
    return [];
  }
}

async function completeSystem(systemId: string) {
  const system = SYSTEMS[systemId];
  if (!system) {
    console.error(`❌ System ${systemId} not found`);
    process.exit(1);
  }

  console.log(`\n📚 Completing vignettes for ${system.name} (${systemId})`);
  console.log('='.repeat(80));

  // Check existing vignettes
  const { data: existing, error } = await supabase
    .from('base_vignettes')
    .select('difficulty')
    .eq('system', systemId);

  if (error) {
    console.error(`❌ Error checking existing vignettes: ${error.message}`);
    process.exit(1);
  }

  const currentEasy = existing?.filter(v => v.difficulty === 'easy').length || 0;
  const currentModerate = existing?.filter(v => v.difficulty === 'moderate').length || 0;
  const currentHard = existing?.filter(v => v.difficulty === 'hard').length || 0;
  const currentTotal = existing?.length || 0;

  // NEW TARGET: 500 per system (30% easy, 50% moderate, 20% hard)
  const TARGET_TOTAL = 500;
  const TARGET_EASY = 150;      // 30%
  const TARGET_MODERATE = 250;  // 50%
  const TARGET_HARD = 100;      // 20%

  console.log(`\n📊 Current Status:`);
  console.log(`  Easy:     ${currentEasy}/${TARGET_EASY} (target 30%)`);
  console.log(`  Moderate: ${currentModerate}/${TARGET_MODERATE} (target 50%)`);
  console.log(`  Hard:     ${currentHard}/${TARGET_HARD} (target 20%)`);
  console.log(`  Total:    ${currentTotal}/${TARGET_TOTAL}\n`);

  // Calculate what's needed
  const neededEasy = Math.max(0, TARGET_EASY - currentEasy);
  const neededModerate = Math.max(0, TARGET_MODERATE - currentModerate);
  const neededHard = Math.max(0, TARGET_HARD - currentHard);
  const neededTotal = neededEasy + neededModerate + neededHard;

  if (neededTotal === 0) {
    console.log(`✅ ${system.name} is already complete with ${currentTotal} vignettes!\n`);
    return;
  }

  console.log(`🎯 Need to generate:`);
  console.log(`  Easy:     ${neededEasy}`);
  console.log(`  Moderate: ${neededModerate}`);
  console.log(`  Hard:     ${neededHard}`);
  console.log(`  Total:    ${neededTotal}\n`);

  // Distribute needed vignettes across topics
  const vignettePerTopic = {
    easy: Math.ceil(neededEasy / system.topics.length),
    moderate: Math.ceil(neededModerate / system.topics.length),
    hard: Math.ceil(neededHard / system.topics.length)
  };

  let totalGenerated = 0;

  for (let i = 0; i < system.topics.length; i++) {
    const topic = system.topics[i];
    console.log(`\n  📝 Topic ${i + 1}/${system.topics.length}: ${topic}`);

    for (const difficulty of ['easy', 'moderate', 'hard'] as const) {
      const remaining = difficulty === 'easy' ? neededEasy : difficulty === 'moderate' ? neededModerate : neededHard;
      if (remaining - totalGenerated <= 0) continue;

      let count = Math.min(
        vignettePerTopic[difficulty],
        remaining - totalGenerated
      );

      if (count === 0) continue;

      // Break large batches into smaller chunks to avoid JSON parsing errors
      const MAX_BATCH_SIZE = 10;

      while (count > 0) {
        const batchSize = Math.min(count, MAX_BATCH_SIZE);

        try {
          const vignettes = await generateVignettesWithAI(systemId, topic, difficulty, batchSize);

          if (vignettes.length > 0) {
            const records = vignettes.map(v => ({
              ...v,
              system: systemId,
              topic,
              difficulty,
              tags: [systemId, topic, difficulty]
            }));

            const { error: insertError } = await supabase
              .from('base_vignettes')
              .insert(records);

            if (insertError) {
              console.error(`      ❌ Insert error: ${insertError.message}`);
            } else {
              console.log(`      ✅ Inserted ${vignettes.length} ${difficulty} vignettes`);
              totalGenerated += vignettes.length;
              count -= vignettes.length;
            }
          } else {
            // Failed to generate, skip this batch
            count -= batchSize;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
          console.error(`      ❌ Error: ${err.message}`);
          count -= batchSize; // Skip failed batch and continue
        }
      }
    }
  }

  console.log(`\n✅ Completed ${system.name}: Generated ${totalGenerated} new vignettes`);
  console.log(`   Total for system: ${currentTotal + totalGenerated}/500\n`);
}

// Parse command line args
const args = process.argv.slice(2);
const systemArg = args.find(arg => arg.startsWith('--system='));

if (!systemArg) {
  console.error('❌ Usage: npx tsx scripts/completeSystem.ts --system=<system_id>');
  console.error('\nAvailable systems:');
  for (const [id, sys] of Object.entries(SYSTEMS)) {
    console.error(`  ${id.padEnd(10)} - ${sys.name}`);
  }
  process.exit(1);
}

const systemId = systemArg.split('=')[1];
completeSystem(systemId).catch(console.error);
