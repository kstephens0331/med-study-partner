// src/app/api/lecture/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
export const runtime="nodejs";
const TRANSCRIBE_URL=process.env.TRANSCRIBE_URL!;
export async function POST(req:NextRequest){
  const form=await req.formData();
  const file=form.get("file") as File|null;
  const userId=form.get("userId") as string;
  const blockId=form.get("blockId") as string;
  const title=(form.get("title") as string)||"Lecture";
  if(!file||!userId||!blockId) return NextResponse.json({ok:false,error:"file,userId,blockId required"},{status:400});
  const fd=new FormData(); fd.append("file",file);
  const r=await fetch(TRANSCRIBE_URL,{method:"POST",body:fd as any});
  if(!r.ok) return NextResponse.json({ok:false,error:await r.text()},{status:500});
  const tr=await r.json(); if(!tr.ok) return NextResponse.json({ok:false,error:tr.error},{status:500});
  const sb=supa();
  const {data,error}=await sb.from("lectures").insert({
    user_id:userId, block_id:blockId, title, duration_sec:Math.round(tr.duration||0), transcript:tr
  }).select("*").single();
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,lecture:data});
}
