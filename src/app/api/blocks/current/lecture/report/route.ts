// src/app/api/lecture/summarize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
import { chunkByTime,SUMMARIZE_PROMPT,REDUCE_PROMPT,formatTS,tryExtractJSON } from "@/lib/ai/lecture";

const API=process.env.TOGETHER_API_KEY!; const MODEL=process.env.TOGETHER_MODEL!;
async function chat(messages:any[]){ const r=await fetch("https://api.together.xyz/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${API}`},body:JSON.stringify({model:MODEL,messages,temperature:0.2,max_tokens:1400})}); if(!r.ok) throw new Error(await r.text()); const d=await r.json(); return d?.choices?.[0]?.message?.content||""; }
export const runtime="nodejs";

export async function POST(req:NextRequest){
  const {lectureId}=await req.json(); if(!lectureId) return NextResponse.json({ok:false,error:"lectureId required"},{status:400});
  const sb=supa(); const {data:lec,error}=await sb.from("lectures").select("*").eq("id",lectureId).single();
  if(error||!lec) return NextResponse.json({ok:false,error:"Not found"},{status:404});
  const segments=lec.transcript?.segments||[]; const chunks=chunkByTime(segments, 300);
  const chunkSumm:string[]=[]; const outline:string[]=[];
  for(const c of chunks){
    const minutes=`[${formatTS(c.t0)}–${formatTS(c.t1)}]`; outline.push(`${minutes} ${c.text.slice(0,100)}…`);
    const out=await chat([{role:"system",content:"You are a precise medical educator."},{role:"user",content:`${SUMMARIZE_PROMPT(outline.slice(-5).join("\n"))}\n\n---\n${c.text}`}]);
    chunkSumm.push(`## ${minutes}\n${out}`);
  }
  const reduce=await chat([{role:"system",content:"Output VALID JSON ONLY."},{role:"user",content:`${REDUCE_PROMPT}\n\n---\n${chunkSumm.join("\n\n")}`}]);
  const pack=tryExtractJSON(reduce)||{};
  // optional report
  const repResp=await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lecture/report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mapNotes:chunkSumm, outline, durationSec:lec.duration_sec})});
  const repData=repResp.ok?await repResp.json():{ok:false}; const report=repData?.report||null;
  const {error:insErr}=await sb.from("lecture_packs").insert({
    lecture_id:lectureId, abstract:pack.abstract||"", outline:pack.outline||outline, pearls:pack.pearls||[], cloze:pack.cloze||[],
    quiz:pack.quiz||[], vignettes:pack.vignettes||[], directqs:pack.directqs||[], tags:pack.tags||[], report
  });
  if(insErr) return NextResponse.json({ok:false,error:insErr.message},{status:500});
  return NextResponse.json({ok:true, outline, pack});
}
