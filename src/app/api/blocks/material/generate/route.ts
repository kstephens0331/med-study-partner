// src/app/api/material/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
import { DIRECT_BATCH_PROMPT, CLOZE_BATCH_PROMPT, parseItems } from "@/lib/ai/material";
import { VIGNETTE_BATCH_PROMPT } from "@/lib/ai/vignette";

const API=process.env.TOGETHER_API_KEY!; const MODEL=process.env.TOGETHER_MODEL!;
async function chat(user:string){ const r=await fetch("https://api.together.xyz/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${API}`},body:JSON.stringify({model:MODEL,messages:[{role:"system",content:"Strict JSON."},{role:"user",content:user}],temperature:0.3,max_tokens:1400})}); if(!r.ok) throw new Error(await r.text()); const d=await r.json(); return d?.choices?.[0]?.message?.content||"{}"; }
export const runtime="nodejs";

export async function POST(req:NextRequest){
  const { materialId, wantVignettes=true, directBatches=6, clozeBatches=2 } = await req.json();
  if(!materialId) return NextResponse.json({ok:false,error:"materialId required"},{status:400});
  const sb=supa();
  const { data: m, error } = await sb.from("materials").select("*").eq("id", materialId).single();
  if(error||!m) return NextResponse.json({ok:false,error:"Material not found"},{status:404});

  const ctx = m.text || "";
  let cloze:any[]=[]; let direct:any[]=[]; let vignettes:any[]=[];
  for(let i=0;i<clozeBatches;i++){ const out=await chat(CLOZE_BATCH_PROMPT(ctx)); cloze=cloze.concat(parseItems(out)); }
  for(let i=0;i<directBatches;i++){ const out=await chat(DIRECT_BATCH_PROMPT(ctx)); direct=direct.concat(parseItems(out)); }
  if(wantVignettes){ for(let i=0;i<5;i++){ const out=await chat(VIGNETTE_BATCH_PROMPT(ctx)); vignettes=vignettes.concat(parseItems(out)); } }

  // store
  const { error: insErr } = await sb.from("material_packs").insert({
    material_id: materialId, abstract: "", pearls: [], cloze, directqs: direct, vignettes, tags: [], report: null
  });
  if(insErr) return NextResponse.json({ok:false,error:insErr.message},{status:500});

  return NextResponse.json({ok:true, counts:{cloze:cloze.length, direct:direct.length, vignettes:vignettes.length}});
}
