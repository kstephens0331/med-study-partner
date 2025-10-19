# Base Vignette Generation Scripts

This directory contains scripts for generating the **global base question bank** of 4,000-4,500 USMLE-style vignettes.

## Overview

The base question bank is **shared across all students and schools**. It provides a foundation of high-quality, pre-generated clinical vignettes covering all major medical systems.

### Target Distribution

- **Total Vignettes:** 4,550
- **Systems:** 13 (Heme, Renal, Cards, Neuro, Pulm, Endo, GI, Micro, Pharm, Genetics, OB/GYN, Psych, Peds)
- **Per System:** 350 vignettes
- **Difficulty Distribution:**
  - 30% Easy (straightforward presentations)
  - 50% Moderate (requires differential diagnosis)
  - 20% Hard (atypical presentations, complex cases)

## Prerequisites

1. **Environment Variables** (in `.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE=your_service_role_key
   TOGETHER_API_KEY=your_together_api_key
   ```

2. **Database Migration**:
   ```bash
   # Apply the base_vignettes table migration
   supabase db push
   # OR run manually in Supabase SQL Editor:
   # supabase/migrations/20250120000000_add_base_vignettes.sql
   ```

3. **Dependencies**:
   ```bash
   npm install
   ```

## Usage

### Generate All Systems (4,550 vignettes)

**⚠️ WARNING:** This will take approximately **6-8 hours** and make ~1,500 API calls to Together AI.

**Estimated Cost:** ~$50-75 in API credits

```bash
npx tsx scripts/generateBaseVignettes.ts --all
```

### Generate Single System (350 vignettes)

Recommended for testing or incremental generation:

```bash
# Generate 350 vignettes for Hematology
npx tsx scripts/generateBaseVignettes.ts --system=heme

# Generate custom count
npx tsx scripts/generateBaseVignettes.ts --system=cards --count=100
```

### Available Systems

| System ID | Name | Topics Covered |
|-----------|------|----------------|
| `heme` | Hematology | Iron deficiency, Hemophilia, VWD, ITP, Thalassemia, Sickle cell, etc. |
| `renal` | Renal | AKI, CKD, DKA, HHS, RTA, Nephrotic/Nephritic syndromes, UTI, etc. |
| `cards` | Cardiology | ACS, STEMI, NSTEMI, Heart failure, Arrhythmias, Valvular disease, etc. |
| `neuro` | Neurology | Stroke, TIA, Seizure, Meningitis, MS, Parkinson's, Dementia, etc. |
| `pulm` | Pulmonology | Asthma, COPD, Pneumonia, TB, PE, ARDS, Lung cancer, etc. |
| `endo` | Endocrinology | Graves, Hashimoto, DM, Addison, Cushing, Pheochromocytoma, etc. |
| `gi` | Gastroenterology | GERD, PUD, GI bleed, IBD, Cirrhosis, Hepatitis, Pancreatitis, etc. |
| `micro` | Microbiology | Sepsis, Meningitis, Pneumonia, HIV, Opportunistic infections, STIs, etc. |
| `pharm` | Pharmacology | Toxicology, Drug interactions, ADRs, Warfarin, Serotonin syndrome, etc. |
| `genetics` | Genetics | Chromosomal disorders, Cystic fibrosis, Hemophilia, Cancer genetics, etc. |
| `obgyn` | OB/GYN | Preeclampsia, Eclampsia, HELLP, Ectopic pregnancy, PID, PCOS, etc. |
| `psych` | Psychiatry | Depression, Bipolar, Schizophrenia, Anxiety disorders, Substance abuse, etc. |
| `peds` | Pediatrics | Congenital heart disease, Kawasaki, Croup, Epiglottitis, Child abuse, etc. |

## Generation Process

For each system:

1. **Topic Distribution**: 350 vignettes split across 10 topics (~35 per topic)
2. **Difficulty Split**: 30% easy, 50% moderate, 20% hard
3. **AI Generation**: Uses Llama 3.1 70B model with structured prompts
4. **Database Storage**: Saved to `base_vignettes` table
5. **Rate Limiting**: 1.5 second delay between API calls

## Monitoring Progress

### Check database stats

```sql
-- In Supabase SQL Editor
SELECT * FROM base_vignettes_stats;

-- Get total count
SELECT COUNT(*) FROM base_vignettes;

-- Get breakdown by system
SELECT system, COUNT(*) as count
FROM base_vignettes
GROUP BY system
ORDER BY system;
```

### Via API

```bash
curl https://your-app.vercel.app/api/vignettes/base/stats
```

## Quality Control

After generation:

1. **Review Sample Vignettes**: Check 5-10 from each difficulty level
2. **Verify Structure**: Ensure all have labs, vitals, explanations, comparison tables
3. **Check Accuracy**: Medical content should be USMLE-accurate
4. **Mark Reviewed**:
   ```sql
   UPDATE base_vignettes
   SET is_reviewed = true, quality_score = 5
   WHERE id = 'vignette_id';
   ```

## Troubleshooting

### "SUPABASE_SERVICE_ROLE is not defined"
- Ensure `.env.local` has all required environment variables
- Restart the script after adding variables

### "Failed to parse JSON response"
- AI sometimes returns markdown-wrapped JSON
- Script auto-recovers, but some vignettes may be skipped
- Re-run the specific system if needed

### "Rate limit exceeded"
- Together AI has rate limits (60 requests/min)
- Script includes 1.5s delays, but may need adjustment
- Wait 1 minute and resume

### "Database constraint violation"
- Check that migration was applied correctly
- Verify `base_vignettes` table exists in Supabase

## Incremental Generation Strategy

Instead of generating all at once, consider:

```bash
# Day 1: Generate first 5 systems
npx tsx scripts/generateBaseVignettes.ts --system=heme
npx tsx scripts/generateBaseVignettes.ts --system=renal
npx tsx scripts/generateBaseVignettes.ts --system=cards
npx tsx scripts/generateBaseVignettes.ts --system=neuro
npx tsx scripts/generateBaseVignettes.ts --system=pulm

# Day 2: Next 4 systems
npx tsx scripts/generateBaseVignettes.ts --system=endo
npx tsx scripts/generateBaseVignettes.ts --system=gi
npx tsx scripts/generateBaseVignettes.ts --system=micro
npx tsx scripts/generateBaseVignettes.ts --system=pharm

# Day 3: Final 4 systems
npx tsx scripts/generateBaseVignettes.ts --system=genetics
npx tsx scripts/generateBaseVignettes.ts --system=obgyn
npx tsx scripts/generateBaseVignettes.ts --system=psych
npx tsx scripts/generateBaseVignettes.ts --system=peds
```

## Cost Estimation

- **Per Vignette:** ~$0.01-0.02 in API costs
- **Per System (350):** ~$3.50-7.00
- **All Systems (4,550):** ~$45-90

Actual cost depends on Together AI pricing tier.

## Output Format

Each generated vignette includes:

- **Clinical Presentation** (1-2 paragraphs)
- **Lab Panel** (test, result, reference range)
- **Vital Signs** (BP, HR, Temp, RR, O₂ Sat)
- **Multiple Choice** (A-E options)
- **Correct Answer**
- **Detailed Explanation** (200-400 words with pathophysiology)
- **Comparison Table** (differential diagnosis)
- **Tags** (system:topic format)
- **Difficulty Level** (easy/moderate/hard)

## Next Steps After Generation

1. **Deploy to Production**: Changes auto-deploy via Vercel
2. **Test API**: `GET /api/vignettes/base?system=heme&limit=10`
3. **Student Access**: All students automatically have access
4. **Monitor Usage**: Track which vignettes are most used
5. **Continuous Improvement**: Add more variants, update based on feedback
