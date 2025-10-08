// src/app/api/vignettes/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
import { VIGNETTE_BATCH_PROMPT } from "@/lib/ai/vignette";
import { parseItems } from "@/lib/ai/material";
const API=process.env.TOGETHER_API_KEY!; const MODEL=process.env.TOGETHER_MODEL!;
async function chat(u:string){ const r=await fetch("https://api.together.xyz/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${API}`},body:JSON.stringify({model:MODEL,messages:[{role:"system",content:"Strict JSON."},{role:"user",content:u}],temperature:0.3,max_tokens:1400})}); if(!r.ok) throw new Error(await r.text()); const d=await r.json(); return d?.choices?.[0]?.message?.content||"{}";}
export const runtime="nodejs";
export async function POST(req:NextRequest){
  const { lectureId }=await req.json(); if(!lectureId) return NextResponse.json({ok:false,error:"lectureId required"},{status:400});
  const sb=supa();
  const {data: lp} = await sb.from("lecture_packs").select("*").eq("lecture_id", lectureId).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const ctx = JSON.stringify(lp||{});
  const out = await chat(VIGNETTE_BATCH_PROMPT(ctx));
  const items = parseItems(out);
  const merged = (lp?.vignettes||[]).concat(items);
  await sb.from("lecture_packs").update({ vignettes: merged }).eq("lecture_id", lectureId);
  return NextResponse.json({ok:true, added:items.length, total: merged.length});
}
