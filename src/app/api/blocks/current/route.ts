// src/app/api/blocks/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
export const runtime="nodejs";
export async function POST(req:NextRequest){
  const {userId,name,startDate,endDate}=await req.json();
  if(!userId||!name||!startDate||!endDate) return NextResponse.json({ok:false,error:"Missing"}, {status:400});
  const sb=supa();
  const {data:ex}=await sb.from("blocks").select("*").eq("user_id",userId).eq("name",name).maybeSingle();
  if(ex) return NextResponse.json({ok:true,block:ex});
  const {data,error}=await sb.from("blocks").insert({user_id:userId,name,start_date:startDate,end_date:endDate}).select("*").single();
  if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,block:data});
}
