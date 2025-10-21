/**
 * DxR Case Generator Script
 *
 * Generates 1,500 virtual patient cases using AI
 * Target Distribution:
 * - Difficulty: 25% beginner, 35% intermediate, 30% advanced, 10% expert
 * - Types: 60% common PCP, 25% intermediate, 15% rare/complex
 *
 * Usage:
 *   npx tsx scripts/generateDxRCases.ts --difficulty beginner --count 100
 *   npx tsx scripts/generateDxRCases.ts --all
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !TOGETHER_API_KEY) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Case distribution targets
const DIFFICULTY_DISTRIBUTION = {
  beginner: 375,      // 25% - Basic PCP presentations
  intermediate: 525,  // 35% - Common but more complex
  advanced: 450,      // 30% - Challenging cases
  expert: 150         // 10% - Rare, complex, or multi-system
};

const CASE_TYPES = [
  // Common PCP presentations (60%)
  { type: 'common', specialties: ['primary-care', 'family-medicine'], count: 900 },
  // Intermediate complexity (25%)
  { type: 'intermediate', specialties: ['internal-medicine', 'emergency'], count: 375 },
  // Rare/Complex (15%)
  { type: 'rare', specialties: ['specialty', 'complex'], count: 225 }
];

const SYSTEMS = [
  'heme', 'renal', 'cards', 'neuro', 'pulm', 'endo', 'gi',
  'micro', 'pharm', 'genetics', 'obgyn', 'psych', 'peds'
];

const DXR_CASE_PROMPT = (difficulty: string, caseType: string, system?: string) => `
Generate a complete DxR-style virtual patient case for medical student clinical reasoning training.

**Case Parameters:**
- Difficulty: ${difficulty}
- Case Type: ${caseType} ${system ? `(${system} system)` : ''}
- Setting: ${caseType === 'common' ? 'outpatient/clinic' : caseType === 'rare' ? 'varied' : 'emergency/inpatient'}

**Requirements:**
Create an EXTREMELY DETAILED and CLINICALLY ACCURATE virtual patient encounter with:

1. **Patient Demographics & Chief Complaint**
2. **History of Present Illness (HPI)** - 12-20 questions students can ask with detailed responses
3. **Past Medical History, Family History, Social History** - Comprehensive relevant details
4. **Review of Systems (ROS)** - Complete 14-point ROS with pertinent positives/negatives
5. **Physical Exam Findings** - Comprehensive exam by system:
   - General appearance, vital signs
   - HEENT (including fundoscopy, visual fields, cranial nerves)
   - Neck (JVP, thyroid, lymph nodes, carotid bruits)
   - Cardiovascular (heart sounds, murmurs, peripheral pulses, edema)
   - Pulmonary (inspection, palpation, percussion, auscultation)
   - Abdomen (inspection, auscultation, percussion, palpation including liver/spleen span)
   - Musculoskeletal (joint exam, ROM, strength testing)
   - Neurological (mental status, cranial nerves, motor, sensory, reflexes, cerebellar, gait)
   - Skin (lesions, rashes, turgor, capillary refill)
   - Special tests (Babinski, Romberg, Murphy's sign, Kernig/Brudzinski, etc.)

6. **Available Laboratory Tests** - COMPREHENSIVE list (15-25 options):
   - CBC with differential
   - Comprehensive metabolic panel (CMP)
   - Liver function tests (LFTs)
   - Coagulation studies (PT/INR, PTT)
   - Cardiac enzymes (troponin, CK-MB, BNP)
   - Thyroid function (TSH, free T4, T3)
   - Hemoglobin A1c
   - Lipid panel
   - Urinalysis with microscopy
   - Urine culture and sensitivity
   - Blood cultures
   - ESR and CRP
   - D-dimer
   - Arterial blood gas (ABG)
   - Venous blood gas (VBG)
   - Lactate
   - Ammonia
   - Drug levels (digoxin, anticonvulsants, etc.)
   - Toxicology screen
   - Pregnancy test (beta-hCG)
   - Tumor markers (PSA, CEA, CA 19-9, etc.)
   - Autoimmune panels (ANA, RF, anti-CCP, ANCA, etc.)
   - Infectious disease serology (HIV, hepatitis panel, Lyme, etc.)
   - Cerebrospinal fluid analysis (if LP performed)
   - Specialty labs based on case (iron studies, B12/folate, cortisol, ACTH, etc.)

7. **Available Imaging Studies** - COMPREHENSIVE list (10-15 options):
   - Chest X-ray (PA, lateral, decubitus, lordotic views)
   - Abdominal X-ray (supine, upright, cross-table lateral)
   - CT Head without contrast
   - CT Head with contrast
   - CT Chest with/without contrast
   - CT Abdomen/Pelvis with/without contrast
   - CT Angiography (CTA chest, CTA head/neck, etc.)
   - MRI Brain with/without contrast
   - MRI Spine (cervical, thoracic, lumbar)
   - MRI with specialized sequences (MRA, MRV, MRCP, etc.)
   - Ultrasound (abdominal, pelvic, renal, cardiac, vascular, FAST)
   - Echocardiography (transthoracic, transesophageal)
   - Nuclear medicine (V/Q scan, bone scan, PET scan, etc.)
   - Fluoroscopy (barium swallow, upper GI series, barium enema)
   - Specialized studies (HIDA scan, colonoscopy, endoscopy, bronchoscopy, etc.)

8. **Available Procedures/Special Tests**:
   - EKG (12-lead, rhythm strip)
   - Stress testing (exercise, pharmacologic, nuclear)
   - Pulmonary function tests (spirometry, peak flow)
   - Lumbar puncture
   - Arthrocentesis
   - Thoracentesis
   - Paracentesis
   - Skin biopsy
   - Fine needle aspiration
   - Ankle-brachial index
   - Doppler studies

9. **Correct Diagnosis** - Specific final diagnosis with ICD-10 code
10. **Differential Diagnosis** - Top 5-7 ranked with detailed justification
11. **Key Findings** - Must-identify findings for good performance (10-15 items)
12. **Red Flags** - Critical findings that shouldn't be missed
13. **Learning Objectives** - 5-8 teaching points
14. **Clinical Reasoning Pitfalls** - Common errors students make on this case

**For ${difficulty} difficulty:**
${difficulty === 'beginner' ? '- Straightforward presentation\n- Classic findings\n- Common diagnosis\n- Clear differentials' : ''}
${difficulty === 'intermediate' ? '- Some atypical features\n- Multiple systems involved\n- Requires systematic workup\n- Broader differential' : ''}
${difficulty === 'advanced' ? '- Atypical presentation\n- Confounding factors\n- Multiple comorbidities\n- Complex differential' : ''}
${difficulty === 'expert' ? '- Rare disease or unusual presentation\n- Multi-system involvement\n- Requires advanced reasoning\n- Very broad differential with zebras' : ''}

Return ONLY valid JSON in this exact format:
{
  "case": {
    "title": "Brief case title (e.g., '42-year-old with chest pain')",
    "patient_age": 42,
    "patient_sex": "M",
    "patient_name": "John Doe",
    "chief_complaint": "Chief complaint as stated by patient",
    "difficulty": "${difficulty}",
    "complexity_score": 5,
    "system": "${system || 'mixed'}",
    "specialty": "primary-care",
    "setting": "outpatient",
    "is_common": ${caseType === 'common'},
    "is_rare": ${caseType === 'rare'},
    "is_emergency": false,

    "history_items": [
      {
        "category": "HPI",
        "question": "Tell me more about your chest pain",
        "response": "Detailed patient response...",
        "isKeyFinding": true
      },
      {
        "category": "PMH",
        "question": "Do you have any chronic medical conditions?",
        "response": "Patient's past medical history...",
        "isKeyFinding": false
      },
      {
        "category": "FH",
        "question": "Any family history of heart disease?",
        "response": "Family history details...",
        "isKeyFinding": false
      },
      {
        "category": "SH",
        "question": "Do you smoke or drink alcohol?",
        "response": "Social history details...",
        "isKeyFinding": false
      },
      {
        "category": "ROS",
        "question": "Any fever, chills, or night sweats?",
        "response": "Review of systems response...",
        "isKeyFinding": false
      }
    ],

    "physical_exam_findings": [
      {
        "system": "General",
        "finding": "Alert, well-appearing, in no acute distress",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Vital Signs",
        "finding": "BP 140/90, HR 88, RR 16, Temp 98.6°F, SpO2 98% on RA",
        "isAbnormal": true,
        "isKeyFinding": true
      },
      {
        "system": "HEENT",
        "finding": "Normocephalic, atraumatic. PERRLA. EOMI. TMs clear. Oropharynx clear.",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Neck",
        "finding": "Supple, no JVD, no thyromegaly, no carotid bruits",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Cardiovascular",
        "finding": "Regular rate and rhythm, S1 S2 normal, no murmurs/rubs/gallops",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Pulmonary",
        "finding": "Clear to auscultation bilaterally, no wheezes/rales/rhonchi",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Abdomen",
        "finding": "Soft, non-tender, non-distended, normal bowel sounds",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Neurological",
        "finding": "Alert and oriented x3, CN II-XII intact, strength 5/5 all extremities",
        "isAbnormal": false,
        "isKeyFinding": false
      },
      {
        "system": "Skin",
        "finding": "Warm, dry, normal turgor, no rashes or lesions",
        "isAbnormal": false,
        "isKeyFinding": false
      }
    ],

    "available_labs": [
      {
        "name": "Complete Blood Count with Differential",
        "category": "Hematology",
        "cost": 25,
        "turnaround_time": "1 hour",
        "clinical_indication": "Evaluate for infection, anemia, or hematologic disorders",
        "results": [
          {"test": "WBC", "value": "7.2", "unit": "K/µL", "referenceRange": "4.5-11.0", "isAbnormal": false},
          {"test": "Hemoglobin", "value": "14.5", "unit": "g/dL", "referenceRange": "13.5-17.5", "isAbnormal": false},
          {"test": "Hematocrit", "value": "43", "unit": "%", "referenceRange": "40-50", "isAbnormal": false},
          {"test": "Platelets", "value": "250", "unit": "K/µL", "referenceRange": "150-400", "isAbnormal": false}
        ]
      },
      {
        "name": "Comprehensive Metabolic Panel",
        "category": "Chemistry",
        "cost": 30,
        "turnaround_time": "1 hour",
        "clinical_indication": "Evaluate electrolytes, kidney function, liver function, glucose",
        "results": [
          {"test": "Sodium", "value": "140", "unit": "mEq/L", "referenceRange": "136-145", "isAbnormal": false},
          {"test": "Potassium", "value": "4.0", "unit": "mEq/L", "referenceRange": "3.5-5.0", "isAbnormal": false},
          {"test": "Creatinine", "value": "1.0", "unit": "mg/dL", "referenceRange": "0.6-1.2", "isAbnormal": false},
          {"test": "Glucose", "value": "95", "unit": "mg/dL", "referenceRange": "70-100", "isAbnormal": false}
        ]
      },
      {
        "name": "Troponin I",
        "category": "Cardiac",
        "cost": 50,
        "turnaround_time": "1 hour",
        "clinical_indication": "Rule out acute myocardial infarction",
        "results": [
          {"test": "Troponin I", "value": "0.02", "unit": "ng/mL", "referenceRange": "<0.04", "isAbnormal": false}
        ]
      },
      {
        "name": "Urinalysis with Microscopy",
        "category": "Urinalysis",
        "cost": 15,
        "turnaround_time": "30 minutes",
        "clinical_indication": "Evaluate for UTI, hematuria, proteinuria",
        "results": [
          {"test": "Color", "value": "Yellow", "unit": "", "referenceRange": "Yellow", "isAbnormal": false},
          {"test": "Specific Gravity", "value": "1.015", "unit": "", "referenceRange": "1.005-1.030", "isAbnormal": false},
          {"test": "WBC", "value": "0-2", "unit": "/hpf", "referenceRange": "0-5", "isAbnormal": false}
        ]
      }
    ],

    "available_imaging": [
      {
        "name": "Chest X-ray PA and Lateral",
        "modality": "X-ray",
        "body_part": "Chest",
        "cost": 150,
        "turnaround_time": "1 hour",
        "radiation": true,
        "radiation_dose": "0.1 mSv",
        "clinical_indication": "Evaluate for pneumonia, pleural effusion, cardiomegaly",
        "findings": "Clear lung fields bilaterally. No infiltrates, effusions, or pneumothorax. Normal cardiac silhouette. No acute cardiopulmonary process.",
        "impression": "No acute cardiopulmonary findings"
      },
      {
        "name": "CT Head without Contrast",
        "modality": "CT",
        "body_part": "Head",
        "cost": 800,
        "turnaround_time": "2 hours",
        "radiation": true,
        "radiation_dose": "2 mSv",
        "clinical_indication": "Rule out intracranial hemorrhage or mass",
        "findings": "No acute intracranial hemorrhage, mass effect, or midline shift. Ventricles and sulci are normal in size and configuration.",
        "impression": "No acute intracranial abnormality"
      },
      {
        "name": "EKG 12-lead",
        "modality": "Electrocardiography",
        "body_part": "Cardiac",
        "cost": 50,
        "turnaround_time": "Immediate",
        "radiation": false,
        "clinical_indication": "Evaluate for arrhythmia, ischemia, or conduction abnormalities",
        "findings": "Normal sinus rhythm at 75 bpm. Normal axis. Normal intervals. No ST-T wave changes.",
        "impression": "Normal EKG"
      }
    ],

    "available_procedures": [
      {
        "name": "Lumbar Puncture",
        "category": "Invasive Diagnostic",
        "cost": 500,
        "turnaround_time": "2 hours",
        "risks": "Headache, infection, bleeding",
        "contraindications": "Increased ICP, coagulopathy, skin infection at site",
        "findings": "Opening pressure 15 cm H2O. Clear, colorless fluid. WBC 2, RBC 0, Glucose 60, Protein 40."
      }
    ],

    "correct_diagnosis": "Specific diagnosis with ICD-10 code",
    "diagnosis_icd10": "I21.9",

    "correct_differential": [
      {
        "diagnosis": "Most likely diagnosis",
        "rank": 1,
        "likelihood": "High",
        "justification": "Why this is most likely based on history, exam, and initial workup...",
        "supporting_findings": ["Finding 1", "Finding 2", "Finding 3"],
        "contradicting_findings": ["Against diagnosis X"],
        "next_steps": "Confirmatory test or treatment to pursue"
      }
    ],

    "key_findings": [
      "Must-identify finding 1",
      "Must-identify finding 2",
      "Must-identify finding 3"
    ],
    "red_flags": [
      "Critical finding that shouldn't be missed",
      "Another red flag"
    ],
    "learning_objectives": [
      "Learning point 1",
      "Learning point 2",
      "Learning point 3"
    ],
    "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
    "clinical_pearls": "Important clinical pearl for this case...",
    "common_pitfalls": [
      "Pitfall 1: Common error students make",
      "Pitfall 2: Another mistake to avoid"
    ],

    "image_generation_prompts": {
      "patient_photo": "Detailed Stable Diffusion prompt for generating this exact patient's photo based on age, sex, ethnicity, build, and any visible features",
      "visual_findings": [
        {
          "finding_type": "skin_finding",
          "finding_name": "Jaundice",
          "location": "sclera and skin",
          "sd_prompt": "Professional medical close-up photograph showing yellowing of the sclera and skin (jaundice), clear detail, clinical photography",
          "requires_action": "examine_skin",
          "is_key_finding": true
        }
      ],
      "radiology_prompts": [
        {
          "study_name": "Chest X-ray PA and Lateral",
          "modality": "X-ray",
          "sd_prompt": "Medical chest X-ray radiograph PA view showing [specific findings], professional radiology imaging, high contrast black and white",
          "requires_action": "order_chest_xray"
        }
      ],
      "diagnostic_prompts": [
        {
          "test_name": "12-lead EKG",
          "sd_prompt": "Medical 12-lead EKG tracing showing [specific rhythm/findings], standard EKG grid paper, diagnostic quality",
          "requires_action": "order_ekg"
        }
      ]
    }
  }
}

CRITICAL INSTRUCTIONS FOR IMAGE PROMPTS:
1. The patient_photo prompt MUST describe the EXACT patient (age, sex, build, ethnicity, any visible characteristics)
2. For visual_findings, ONLY include findings that are actually VISIBLE (jaundice, cyanosis, rashes, edema, etc.)
3. Each Stable Diffusion prompt must be EXTREMELY SPECIFIC about what the image should show
4. Radiology prompts must describe the EXACT findings that would be seen on that imaging study
5. Do NOT include findings that aren't visually apparent or relevant to this specific case
6. Image prompts should be medically accurate and match the case diagnosis exactly
`;

async function generateCaseWithAI(difficulty: string, caseType: string, system?: string): Promise<any> {
  const prompt = DXR_CASE_PROMPT(difficulty, caseType, system);

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
          content: 'You are an expert medical educator creating virtual patient cases. You ONLY respond with valid JSON.'
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
    return parsed.case || null;
  } catch (e) {
    console.error('      ❌ Failed to parse JSON response');
    return null;
  }
}

async function generateCases(difficulty: string, count: number) {
  console.log(`\n📚 Generating ${count} ${difficulty} DxR cases...`);

  // Check existing count
  const { count: existingCount } = await supabase
    .from('dxr_cases')
    .select('*', { count: 'exact', head: true })
    .eq('difficulty', difficulty);

  const current = existingCount || 0;
  const target = DIFFICULTY_DISTRIBUTION[difficulty as keyof typeof DIFFICULTY_DISTRIBUTION];
  const needed = Math.max(0, target - current);

  console.log(`\n📊 Current: ${current}/${target}`);

  if (needed === 0) {
    console.log(`✅ ${difficulty} cases already complete!\n`);
    return 0;
  }

  console.log(`🎯 Generating ${Math.min(count, needed)} new cases\n`);

  let totalGenerated = 0;
  const batchSize = 5;

  for (let i = 0; i < Math.min(count, needed); i += batchSize) {
    const batch = Math.min(batchSize, Math.min(count, needed) - i);

    for (let j = 0; j < batch; j++) {
      const caseNum = current + totalGenerated + 1;

      // Determine case type based on difficulty
      let caseType = 'intermediate';
      if (difficulty === 'beginner') caseType = 'common';
      if (difficulty === 'expert') caseType = 'rare';

      // Pick random system
      const system = SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)];

      try {
        console.log(`  [${caseNum}/${target}] Generating ${difficulty} ${caseType} case (${system})...`);

        const caseData = await generateCaseWithAI(difficulty, caseType, system);

        if (caseData) {
          // Insert into database
          const { error } = await supabase
            .from('dxr_cases')
            .insert({
              case_number: caseNum,
              ...caseData
            });

          if (error) {
            console.error(`      ❌ Insert error: ${error.message}`);
          } else {
            console.log(`      ✅ Case ${caseNum} created`);
            totalGenerated++;
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err: any) {
        console.error(`      ❌ Error: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Generated ${totalGenerated} ${difficulty} cases`);
  console.log(`   Total: ${current + totalGenerated}/${target}\n`);

  return totalGenerated;
}

async function generateAllCases() {
  console.log('\n🚀 Starting DxR Case Generation');
  console.log('Target: 1,500 total cases');
  console.log('='.repeat(80));

  for (const [difficulty, target] of Object.entries(DIFFICULTY_DISTRIBUTION)) {
    await generateCases(difficulty, target);
  }

  console.log('\n✅ DxR case generation complete!');
  console.log('Run validation: npx tsx scripts/validateDxRCases.ts\n');
}

// Parse command line args
const args = process.argv.slice(2);
const allFlag = args.includes('--all');
const difficultyArg = args.find(arg => arg.startsWith('--difficulty='));
const countArg = args.find(arg => arg.startsWith('--count='));

if (allFlag) {
  generateAllCases().catch(console.error);
} else if (difficultyArg) {
  const difficulty = difficultyArg.split('=')[1];
  const count = countArg ? parseInt(countArg.split('=')[1]) : 100;

  if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(difficulty)) {
    console.error('❌ Invalid difficulty. Use: beginner, intermediate, advanced, or expert');
    process.exit(1);
  }

  generateCases(difficulty, count).catch(console.error);
} else {
  console.error('❌ Usage:');
  console.error('  Generate all: npx tsx scripts/generateDxRCases.ts --all');
  console.error('  Generate specific: npx tsx scripts/generateDxRCases.ts --difficulty=beginner --count=100');
  process.exit(1);
}
