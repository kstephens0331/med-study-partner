// src/lib/ai/vignette.ts
export const VIGNETTE_BATCH_PROMPT=(context:string)=>`
Generate 5 NBME-style clinical vignettes from this content. Each with A–E options.
Return JSON ONLY: {"items":[{ "stem":"...", "lead_in":"...", "options":["A. ...","B. ...","C. ...","D. ...","E. ..."], "answer":"B", "rationale":"...", "blueprint":{"system":"...", "task":"diagnosis|mechanism|interpretation|management|ethics","difficulty":"easy|moderate|hard","tags":["..."]}}]}
Content:
"""${context.slice(0,9000)}"""`.trim();
