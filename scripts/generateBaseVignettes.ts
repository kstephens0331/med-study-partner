/**
 * Base Vignette Generator Script
 *
 * Generates 4,000-4,500 USMLE-style vignettes for the global question bank
 *
 * Target Distribution:
 * - 13 systems × 350 vignettes = 4,550 total
 * - Difficulty: 30% easy, 50% moderate, 20% hard
 *
 * Usage:
 *   npx tsx scripts/generateBaseVignettes.ts --system heme --count 350
 *   npx tsx scripts/generateBaseVignettes.ts --all
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !TOGETHER_API_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure .env.local contains:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE');
  console.error('  - TOGETHER_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const SYSTEMS = [
  { id: 'heme', name: 'Hematology', topics: ['iron-deficiency', 'hemophilia', 'vwd', 'itp', 'thalassemia', 'sickle-cell', 'polycythemia', 'leukemia-acute', 'leukemia-chronic', 'lymphoma'] },
  { id: 'renal', name: 'Renal', topics: ['aki', 'ckd', 'dka', 'hhs', 'rta', 'nephrotic-syndrome', 'nephritic-syndrome', 'uti', 'pyelonephritis', 'electrolytes'] },
  { id: 'cards', name: 'Cardiology', topics: ['acs', 'stemi', 'nstemi', 'heart-failure', 'afib', 'vt', 'pericarditis', 'endocarditis', 'valvular', 'hypertension'] },
  { id: 'neuro', name: 'Neurology', topics: ['stroke-ischemic', 'stroke-hemorrhagic', 'tia', 'seizure', 'meningitis', 'encephalitis', 'multiple-sclerosis', 'parkinsons', 'alzheimers', 'headache'] },
  { id: 'pulm', name: 'Pulmonology', topics: ['asthma', 'copd', 'pneumonia', 'tb', 'pe', 'ards', 'lung-cancer', 'pleural-effusion', 'pneumothorax', 'ild'] },
  { id: 'endo', name: 'Endocrinology', topics: ['graves', 'hashimoto', 'thyroid-cancer', 'dm-type1', 'dm-type2', 'addison', 'cushing', 'pheochromocytoma', 'hyperparathyroid', 'osteoporosis'] },
  { id: 'gi', name: 'Gastroenterology', topics: ['gerd', 'pud', 'gi-bleed', 'ibd-crohns', 'ibd-uc', 'cirrhosis', 'hepatitis', 'pancreatitis', 'cholecystitis', 'appendicitis'] },
  { id: 'micro', name: 'Microbiology', topics: ['sepsis', 'meningitis-bacterial', 'meningitis-viral', 'pneumonia-cap', 'pneumonia-hap', 'hiv', 'opportunistic-infections', 'sti', 'skin-infections', 'osteomyelitis'] },
  { id: 'pharm', name: 'Pharmacology', topics: ['acetaminophen-toxicity', 'salicylate-toxicity', 'opioid-overdose', 'warfarin-management', 'serotonin-syndrome', 'nms', 'malignant-hyperthermia', 'drug-interactions', 'adrs', 'chemo-complications'] },
  { id: 'genetics', name: 'Genetics', topics: ['down-syndrome', 'turner-syndrome', 'klinefelter', 'cystic-fibrosis', 'sickle-cell-genetics', 'hemophilia-genetics', 'huntington', 'fragile-x', 'brca', 'lynch-syndrome'] },
  { id: 'obgyn', name: 'OB/GYN', topics: ['preeclampsia', 'eclampsia', 'hellp', 'ectopic-pregnancy', 'placenta-previa', 'placental-abruption', 'pid', 'ovarian-torsion', 'pcos', 'endometriosis'] },
  { id: 'psych', name: 'Psychiatry', topics: ['mdd', 'bipolar', 'schizophrenia', 'gad', 'panic-disorder', 'ocd', 'ptsd', 'anorexia', 'bulimia', 'alcohol-withdrawal'] },
  { id: 'peds', name: 'Pediatrics', topics: ['vsd', 'asd', 'tof', 'coarctation', 'kawasaki', 'croup', 'epiglottitis', 'bronchiolitis', 'intussusception', 'child-abuse'] },
];

const VIGNETTE_GENERATION_PROMPT = (system: string, topic: string, difficulty: string, count: number) => `
Generate ${count} USMLE Step 1/Step 2 CK clinical vignettes for the following specifications:

SYSTEM: ${system}
TOPIC: ${topic}
DIFFICULTY: ${difficulty}

REQUIREMENTS:
- Each vignette must be unique with different patient demographics, presentations, and lab values
- Difficulty level "${difficulty}":
  * Easy: Straightforward presentation, classic findings
  * Moderate: Some atypical features, requires differential diagnosis thinking
  * Hard: Atypical presentation, multiple comorbidities, complex decision-making

OUTPUT ONLY VALID JSON (no markdown, no explanations):
{
  "vignettes": [
    {
      "prompt": "A 45-year-old woman presents with... [1-2 paragraph clinical vignette ending with question]",
      "labs": [
        {"test": "Hemoglobin", "result": "8.2 g/dL", "referenceRange": "12–16 g/dL (women)"}
      ],
      "vitals": {
        "BP": "118/76 mmHg",
        "HR": "92 bpm",
        "Temp": "98.6°F (37.0°C)",
        "RR": "16/min",
        "O₂ Sat": "98% on room air"
      },
      "choices": [
        {"label": "A", "text": "Correct answer"},
        {"label": "B", "text": "Plausible distractor"},
        {"label": "C", "text": "Plausible distractor"},
        {"label": "D", "text": "Plausible distractor"},
        {"label": "E", "text": "Plausible distractor"}
      ],
      "correctAnswer": "A",
      "explanation": "Detailed explanation with pathophysiology and why each distractor is wrong",
      "comparisonTable": {
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

  console.log(`  Generating ${count} ${difficulty} vignettes for ${system}:${topic}...`);

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
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);
    return parsed.vignettes || [];
  } catch (e) {
    console.error('  Failed to parse JSON response');
    return [];
  }
}

async function generateSystemVignettes(systemId: string, targetCount: number = 350) {
  const system = SYSTEMS.find(s => s.id === systemId);
  if (!system) {
    console.error(`System ${systemId} not found`);
    return;
  }

  console.log(`\n📚 Generating ${targetCount} vignettes for ${system.name}...`);

  // Distribution: 30% easy, 50% moderate, 20% hard
  const easyCount = Math.round(targetCount * 0.3);
  const moderateCount = Math.round(targetCount * 0.5);
  const hardCount = targetCount - easyCount - moderateCount;

  // Distribute across topics
  const vignettePerTopic = Math.ceil(targetCount / system.topics.length);

  let totalGenerated = 0;

  for (const topic of system.topics) {
    console.log(`\n  Topic: ${topic}`);

    // Generate for each difficulty level
    const topicEasy = Math.round(vignettePerTopic * 0.3);
    const topicModerate = Math.round(vignettePerTopic * 0.5);
    const topicHard = vignettePerTopic - topicEasy - topicModerate;

    for (const [difficulty, count] of [
      ['easy', topicEasy],
      ['moderate', topicModerate],
      ['hard', topicHard]
    ] as const) {
      if (count === 0) continue;

      try {
        const vignettes = await generateVignettesWithAI(systemId, topic, difficulty, count);

        if (vignettes.length > 0) {
          // Insert into database
          const records = vignettes.map((v: any, idx: number) => ({
            prompt: v.prompt,
            labs: v.labs || [],
            vitals: v.vitals || {},
            choices: v.choices,
            correct_answer: v.correctAnswer,
            explanation: v.explanation,
            comparison_table: v.comparisonTable || null,
            tags: v.tags || [`${systemId}:${topic}`],
            system: systemId,
            topic: topic,
            difficulty: difficulty,
            variant_number: totalGenerated + idx + 1,
          }));

          const { data, error } = await supabase
            .from('base_vignettes')
            .insert(records);

          if (error) {
            console.error(`    Error inserting ${difficulty} vignettes:`, error.message);
          } else {
            console.log(`    ✅ Inserted ${vignettes.length} ${difficulty} vignettes`);
            totalGenerated += vignettes.length;
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error: any) {
        console.error(`    ❌ Error generating ${difficulty} vignettes:`, error.message);
      }
    }
  }

  console.log(`\n✅ Total generated for ${system.name}: ${totalGenerated} vignettes`);
}

async function generateAllSystems() {
  console.log('🚀 Starting base vignette generation for ALL systems...\n');
  console.log('Target: 4,550 vignettes (13 systems × 350 each)\n');

  for (const system of SYSTEMS) {
    await generateSystemVignettes(system.id, 350);
  }

  console.log('\n\n🎉 All systems complete! Checking database...\n');

  // Get final count
  const { data, error } = await supabase
    .from('base_vignettes')
    .select('system, difficulty, count', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching stats:', error);
  } else {
    console.log(`Total vignettes in database: ${data?.length || 0}`);
  }
}

// CLI Handling
const args = process.argv.slice(2);
const systemArg = args.find(arg => arg.startsWith('--system='))?.split('=')[1];
const countArg = args.find(arg => arg.startsWith('--count='))?.split('=')[1];
const allFlag = args.includes('--all');

if (allFlag) {
  generateAllSystems().catch(console.error);
} else if (systemArg) {
  const count = countArg ? parseInt(countArg) : 350;
  generateSystemVignettes(systemArg, count).catch(console.error);
} else {
  console.log('Usage:');
  console.log('  Generate all systems:     npx tsx scripts/generateBaseVignettes.ts --all');
  console.log('  Generate one system:      npx tsx scripts/generateBaseVignettes.ts --system=heme --count=350');
  console.log('\nAvailable systems:', SYSTEMS.map(s => s.id).join(', '));
}
