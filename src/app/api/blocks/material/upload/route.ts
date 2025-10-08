// src/app/api/material/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
export const runtime="nodejs";
const INGESTOR_URL=process.env.INGESTOR_URL!;
export async function POST(req:NextRequest){
  const form=await req.formData();
  const file=form.get("file") as File|null;
  const userId=form.get("userId") as string;
  const blockId=form.get("blockId") as string;
  const title=(form.get("title") as string)||(file?.name||"Material");
  if(!file||!userId||!blockId) return NextResponse.json({ok:false,error:"file,userId,blockId required"},{status:400});
  const fd=new FormData(); fd.append("file",file);
  const r=await fetch(INGESTOR_URL,{method:"POST",body:fd as any});
  if(!r.ok) return NextResponse.json({ok:false,error:await r.text()},{status:500});
  const data=await r.json(); if(!data.ok) return NextResponse.json({ok:false,error:data.error},{status:500});
  const sb=supa();
  const {data:row,error}=await sb.from("materials").insert({
    user_id:userId, block_id:blockId, title, kind:data.kind, bytes:(file as any).size||null, outline:data.outline||[], text:data.text||""
  }).select("*").single();
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,material:row});
}
