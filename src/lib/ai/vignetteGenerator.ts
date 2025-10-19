// AI-Powered USMLE Vignette Generator
// Generates high-quality clinical vignettes from uploaded educational materials

export const VIGNETTE_GENERATION_PROMPT = (contentChunk: string, targetCount: number = 5) => `
You are a USMLE Step 1/Step 2 CK question writer creating high-quality clinical vignettes.

Generate ${targetCount} NBME/USMLE-style clinical vignettes from the following educational content.

STRICT REQUIREMENTS:
1. Each vignette must follow this EXACT JSON structure
2. Include detailed 1-2 paragraph clinical presentations
3. Provide complete lab panels with reference ranges
4. Include vital signs
5. Write comprehensive explanations with pathophysiology
6. Explain why EACH distractor is wrong
7. Include comparison tables when relevant for differential diagnosis

CONTENT TO USE:
"""
${contentChunk}
"""

OUTPUT FORMAT (JSON ONLY - NO OTHER TEXT):
{
  "vignettes": [
    {
      "prompt": "A 45-year-old woman with a history of... [1-2 paragraph clinical presentation ending with 'Which of the following is the most appropriate...?']",
      "labs": [
        {"test": "Hemoglobin", "result": "8.2 g/dL", "referenceRange": "12–16 g/dL (women)"},
        {"test": "MCV", "result": "72 fL", "referenceRange": "80–100 fL"},
        {"test": "Ferritin", "result": "8 ng/mL", "referenceRange": "15–200 ng/mL"}
      ],
      "vitals": {
        "BP": "118/76 mmHg",
        "HR": "92 bpm",
        "Temp": "98.6°F (37.0°C)",
        "RR": "16/min",
        "O₂ Sat": "98% on room air"
      },
      "choices": [
        {"label": "A", "text": "Iron deficiency anemia"},
        {"label": "B", "text": "Thalassemia minor"},
        {"label": "C", "text": "Anemia of chronic disease"},
        {"label": "D", "text": "Sideroblastic anemia"},
        {"label": "E", "text": "Vitamin B12 deficiency"}
      ],
      "correctAnswer": "A",
      "explanation": "**Iron deficiency anemia** is correct.\\n\\n**Why this is correct:**\\n- Microcytic anemia (MCV 72 fL)\\n- Low ferritin (<15 ng/mL) is diagnostic\\n- Progressive iron depletion stages...\\n\\n**Pathophysiology:**\\n1. Iron depletion → ↓ heme synthesis\\n2. ↓ Hemoglobin production → microcytic RBCs\\n\\n---\\n\\n**Why the other answers are wrong:**\\n\\n**B. Thalassemia minor:**\\n- Also microcytic, BUT ferritin is NORMAL or elevated\\n- Elevated RBC count (>5 million)\\n- Target cells on smear\\n\\n**C. Anemia of chronic disease:**\\n- Usually normocytic\\n- Ferritin NORMAL or HIGH (acute phase reactant)\\n- Low serum iron BUT high ferritin differentiates from IDA\\n\\n**D. Sideroblastic anemia:**\\n- Ringed sideroblasts on bone marrow (iron trapped in mitochondria)\\n- Elevated ferritin\\n- Causes: lead poisoning, alcoholism, isoniazid\\n\\n**E. Vitamin B12 deficiency:**\\n- MACROCYTIC anemia (MCV >100 fL), not microcytic\\n- Neurologic symptoms (peripheral neuropathy, subacute combined degeneration)",
      "comparisonTable": {
        "title": "Microcytic Anemias: Differential Diagnosis",
        "headers": ["Anemia Type", "MCV", "Ferritin", "TIBC", "Serum Iron", "RBC Count", "Key Features"],
        "rows": [
          {"Anemia Type": "Iron Deficiency", "MCV": "↓ (<80)", "Ferritin": "↓↓", "TIBC": "↑", "Serum Iron": "↓", "RBC Count": "↓", "Key Features": "Koilonychia, pica, glossitis"},
          {"Anemia Type": "Thalassemia", "MCV": "↓↓ (<70)", "Ferritin": "Normal/↑", "TIBC": "Normal", "Serum Iron": "Normal/↑", "RBC Count": "↑", "Key Features": "Target cells, family history"},
          {"Anemia Type": "Anemia of Chronic Disease", "MCV": "Normal/↓", "Ferritin": "↑", "TIBC": "↓", "Serum Iron": "↓", "RBC Count": "↓", "Key Features": "Underlying chronic illness"},
          {"Anemia Type": "Sideroblastic", "MCV": "↓ or Normal", "Ferritin": "↑↑", "TIBC": "Normal", "Serum Iron": "↑", "RBC Count": "↓", "Key Features": "Ringed sideroblasts, lead exposure"}
        ]
      },
      "system": "heme",
      "topic": "iron-deficiency-anemia",
      "difficulty": "moderate",
      "tags": ["heme:anemia-microcytic", "heme:iron-deficiency", "heme:lab-interpretation"]
    }
  ]
}

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no explanations
- Each vignette must be clinically realistic and high-yield for USMLE
- Labs must include reference ranges in the format shown
- Explanations must be detailed (200-400 words minimum)
- Use markdown formatting in explanations (**, ---, etc.)
- correctAnswer must be A, B, C, D, or E
- Include comparison tables for differential diagnoses when relevant
- Tags should be specific (system:topic format)

Generate ${targetCount} vignettes NOW:
`.trim();

export async function generateVignettesFromContent(
  content: string,
  count: number = 5,
  apiKey: string,
  model: string = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
): Promise<any[]> {
  const prompt = VIGNETTE_GENERATION_PROMPT(content, count);

  const response = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert USMLE question writer. You ONLY respond with valid JSON. Never include markdown code blocks or explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Higher creativity for diverse questions
      max_tokens: 8000, // Allow for detailed responses
      response_format: { type: "json_object" } // Force JSON output
    }),
  });

  if (!response.ok) {
    throw new Error(`Together AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawContent = data.choices[0]?.message?.content || "{}";

  // Parse JSON response
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    // Try to extract JSON if wrapped in markdown
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  return parsed.vignettes || [];
}

// Batch generate vignettes from large content (split into chunks)
export async function batchGenerateVignettes(
  fullContent: string,
  targetTotal: number,
  apiKey: string
): Promise<any[]> {
  const CHUNK_SIZE = 8000; // Characters per chunk
  const VIGNETTES_PER_CHUNK = 5;

  const chunks: string[] = [];
  let start = 0;
  while (start < fullContent.length) {
    chunks.push(fullContent.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE;
  }

  const totalChunks = Math.ceil(targetTotal / VIGNETTES_PER_CHUNK);
  const chunksToProcess = chunks.slice(0, totalChunks);

  const allVignettes: any[] = [];

  for (let i = 0; i < chunksToProcess.length; i++) {
    const count = Math.min(VIGNETTES_PER_CHUNK, targetTotal - allVignettes.length);
    if (count <= 0) break;

    console.log(`Generating batch ${i + 1}/${chunksToProcess.length} (${count} vignettes)...`);

    try {
      const vignettes = await generateVignettesFromContent(
        chunksToProcess[i],
        count,
        apiKey
      );
      allVignettes.push(...vignettes);

      // Rate limiting: wait 1 second between requests
      if (i < chunksToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error generating batch ${i + 1}:`, error);
      // Continue with next batch
    }
  }

  return allVignettes.slice(0, targetTotal);
}
