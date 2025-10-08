// src/lib/ai/report.ts
export const REPORT_PROMPT = `
From chunk notes, output JSON:
{
 "overview": {"duration_estimate_min": number, "learning_objectives": string[], "summary": string},
 "timeline": [{"t0":"mm:ss","t1":"mm:ss","title":"string","key_points":string[]}],
 "coverage": {"cardiovascular":number,"respiratory":number,"renal":number,"gastrointestinal":number,"endocrine":number,"hematology/oncology":number,"neurology":number,"psychiatry/behavioral":number,"reproductive":number,"musculoskeletal/derm":number,"immunology":number,"microbiology":number,"biochemistry/genetics":number,"pharmacology":number,"public-health/ethics":number},
 "pearls": string[], "pitfalls": string[], "key_equations_or_thresholds": string[], "references": string[]
}
JSON ONLY.`.trim();
