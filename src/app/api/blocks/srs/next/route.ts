// src/app/api/srs/next/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
export const runtime="nodejs";
export async function POST(req:NextRequest){
  const { userId, blockId, limit=10 } = await req.json();
  if(!userId||!blockId) return NextResponse.json({ok:false,error:"Missing"},{status:400});
  const sb=supa();
  const now=new Date().toISOString();
  const { data, error } = await sb.from("cards").select("*").eq("user_id",userId).eq("block_id",blockId).lte("due_at",now).order("due_at",{ascending:true}).limit(limit);
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,cards:data||[]});
}
