// src/lib/ai/material.ts
export const DIRECT_BATCH_PROMPT=(context:string)=>`
Create 20 direct-ask questions (mix MCQ short-answer) from content.
Output JSON ONLY: {"items":[{"q":"...","opts":["A","B","C","D","E"],"answer":"C","rationale":"...","difficulty":"easy|moderate|hard","tags":["..."]},{ "q":"...", "answer":"...", "rationale":"...", "difficulty":"...", "tags":["..."]}]}
Content:
"""${context.slice(0,9000)}"""`.trim();

export const CLOZE_BATCH_PROMPT=(context:string)=>`
Create 25 concise cloze flashcards from content.
Output JSON ONLY: {"items":[{"q":"...","a":"..."}]}
Content:
"""${context.slice(0,9000)}"""`.trim();

export function parseItems(s:string){ try{const j=JSON.parse(s); if(Array.isArray(j?.items)) return j.items;}catch{} const m=s.match(/\{[\s\S]*\}$/); if(m){try{const j=JSON.parse(m[0]); if(Array.isArray(j?.items)) return j.items;}catch{}} return [];}
