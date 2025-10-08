// src/lib/ai/lecture.ts
export type Seg = { start: number; end: number; text: string };
export function chunkByTime(segments: Seg[], maxSec=300){
  const out:any[]=[]; if(!segments?.length) return out;
  let cur:Seg[]=[], t0=segments[0].start, last=t0;
  for(const s of segments){ cur.push(s); last=s.end; if(last-t0>=maxSec){ out.push({t0, t1:last, text:cur.map(x=>x.text).join(" ")}); cur=[]; t0=s.end; } }
  if(cur.length) out.push({t0, t1:last, text:cur.map(x=>x.text).join(" ")});
  return out;
}
export const SUMMARIZE_PROMPT=(hint?:string)=>`
You are a precise medical educator. Produce compact notes per chunk.
1) 3–6 key points
2) 2–4 pearls/pitfalls
3) thresholds/equations if present
4) JSON code block: {"tags":["system:area-subarea", ...]}
${hint?`Recent outline:\n${hint}\n`: ""}`.trim();

export const REDUCE_PROMPT=`
Create a JSON teaching pack:
{
 "abstract": string (<=120 words),
 "outline": string[],                    // with timestamps
 "pearls": string[],                     // 5–10
 "cloze": [{"q":string,"a":string}],     // 8–15
 "quiz": [{"q":string,"opts"?:string[],"answer":string,"rationale":string}],
 "vignettes": [{
   "stem":string,"lead_in":string,"options":string[],"answer":"A"|"B"|"C"|"D"|"E",
   "rationale":string, "blueprint":{"system":string,"task":"diagnosis"|"mechanism"|"interpretation"|"management"|"ethics","difficulty":"easy"|"moderate"|"hard","tags":string[]}
 }],
 "tags": string[]
}
Output VALID JSON ONLY.
`.trim();

export function formatTS(sec:number){ const m=Math.floor(sec/60), s=Math.floor(sec%60); return `${m}:${String(s).padStart(2,"0")}`;}
export function tryExtractJSON(s:string){ const m=s.match(/\{[\s\S]*\}$/); try{return m?JSON.parse(m[0]):null;}catch{return null;}}
