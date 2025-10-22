/**
 * Generate USMLE Step 1/2 level Trivia Race questions using Together AI
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MEDICAL_SYSTEMS = [
  'Cardiology', 'Pulmonology', 'Gastroenterology', 'Neurology',
  'Endocrinology', 'Hematology', 'Nephrology', 'Psychiatry',
  'Pediatrics', 'OB/GYN', 'Pharmacology', 'Pathology',
  'Microbiology', 'Immunology', 'Genetics', 'Orthopedics',
  'Dermatology', 'Ophthalmology', 'Emergency Medicine'
];

const TRIVIA_PROMPT = (category: string, difficulty: string, count: number) => `
You are a USMLE Step 1/2 question writer. Generate ${count} high-quality multiple choice questions for medical students.

Category: ${category}
Difficulty: ${difficulty}
- Easy: Basic recall, definitions, first-line treatments
- Medium: Clinical application, diagnosis, mechanism of action
- Hard: Complex cases, rare presentations, multi-step reasoning

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "A 55-year-old male with diabetes presents with...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "explanation": "Detailed explanation with pathophysiology and clinical pearls",
      "category": "${category}",
      "subcategory": "Specific topic",
      "difficulty": "${difficulty}",
      "system": "cards/pulm/gi/neuro/etc"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Questions must be USMLE Step 1/2 appropriate
2. Clinical vignette format preferred (patient presentations)
3. All options must be plausible
4. Explanations must include WHY the answer is correct AND why others are wrong
5. Include relevant pathophysiology, mechanisms, clinical pearls
6. 4 options per question
7. Must be medically accurate and evidence-based
8. Focus on high-yield topics

Generate exactly ${count} questions now.
`;

async function generateQuestions(category: string, difficulty: string, count: number) {
  console.log(`\n🤖 Generating ${count} ${difficulty} questions for ${category}...`);

  try {
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
            content: 'You are an expert USMLE question writer. Return ONLY valid JSON, no markdown formatting.'
          },
          {
            role: 'user',
            content: TRIVIA_PROMPT(category, difficulty, count)
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Together AI error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON (remove markdown code blocks if present)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.questions || [];

  } catch (error: any) {
    console.error(`❌ Error generating questions:`, error.message);
    return [];
  }
}

async function insertQuestions(questions: any[]) {
  let inserted = 0;
  let failed = 0;

  for (const q of questions) {
    try {
      const { error } = await supabase.from('trivia_questions').insert({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        category: q.category,
        subcategory: q.subcategory,
        difficulty: q.difficulty,
        system: q.system,
        source_type: 'ai',
      });

      if (error) {
        console.error(`   ❌ Insert error:`, error.message);
        failed++;
      } else {
        inserted++;
        process.stdout.write(`\r   ✅ Inserted: ${inserted}/${questions.length}`);
      }
    } catch (err: any) {
      console.error(`   ❌ Exception:`, err.message);
      failed++;
    }
  }

  console.log(`\n   Summary: ${inserted} inserted, ${failed} failed\n`);
  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const categoryArg = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
  const difficultyArg = args.find(arg => arg.startsWith('--difficulty='))?.split('=')[1];
  const countArg = args.find(arg => arg.startsWith('--count='))?.split('=')[1];

  console.log('\n📚 Trivia Question Generator\n');

  if (args.includes('--all')) {
    // Generate for all systems
    console.log('🎯 Generating questions for ALL systems...\n');

    let totalGenerated = 0;

    for (const system of MEDICAL_SYSTEMS) {
      for (const difficulty of ['easy', 'medium', 'hard']) {
        const count = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 5 : 3; // 13 per system
        const questions = await generateQuestions(system, difficulty, count);

        if (questions.length > 0) {
          const inserted = await insertQuestions(questions);
          totalGenerated += inserted;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Total questions generated: ${totalGenerated}`);
    console.log(`   Target: ${MEDICAL_SYSTEMS.length * 13} questions\n`);

  } else if (categoryArg && difficultyArg && countArg) {
    // Generate specific category/difficulty
    const questions = await generateQuestions(categoryArg, difficultyArg, parseInt(countArg));

    if (questions.length > 0) {
      await insertQuestions(questions);
    }

  } else {
    console.log('Usage:');
    console.log('  --all                                    Generate for all systems');
    console.log('  --category=Cardiology --difficulty=easy --count=10\n');
    console.log('Example:');
    console.log('  npx tsx scripts/generateTriviaQuestions.ts --all');
    console.log('  npx tsx scripts/generateTriviaQuestions.ts --category=Cardiology --difficulty=medium --count=20\n');
    process.exit(1);
  }
}

main().catch(console.error);
