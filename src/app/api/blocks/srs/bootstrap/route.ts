// src/app/api/srs/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/supabaseServer";
export const runtime="nodejs";
export async function POST(req:NextRequest){
  const { userId, blockId, lectureId, materialId } = await req.json();
  if(!userId||!blockId||(!lectureId&&!materialId)) return NextResponse.json({ok:false,error:"Missing"},{status:400});
  const sb=supa();
  let pack:any=null;
  if(lectureId){
    const {data}=await sb.from("lecture_packs").select("*").eq("lecture_id",lectureId).order("created_at",{ascending:false}).limit(1).maybeSingle();
    pack=data;
  } else {
    const {data}=await sb.from("material_packs").select("*").eq("material_id",materialId).order("created_at",{ascending:false}).limit(1).maybeSingle();
    pack=data;
  }
  if(!pack) return NextResponse.json({ok:false,error:"Pack not found"},{status:404});
  const cards:any[]=[];
  (pack.cloze||[]).forEach((c:any)=>cards.push({user_id:userId,block_id:blockId,lecture_id:lectureId||null,material_id:materialId||null,source_kind:"cloze",front:`Cloze: ${c.q}`,back:`Answer: ${c.a}`}));
  (pack.directqs||pack.quiz||[]).forEach((q:any)=>cards.push({user_id:userId,block_id:blockId,lecture_id:lectureId||null,material_id:materialId||null,source_kind:"direct",front:q.opts?`${q.q}\n\n${q.opts.map((o:string,i:number)=>String.fromCharCode(65+i)+". "+o).join("\n")}`:q.q,back:`Answer: ${q.answer}\n\n${q.rationale||""}`}));
  (pack.vignettes||[]).forEach((v:any)=>cards.push({user_id:userId,block_id:blockId,lecture_id:lectureId||null,material_id:materialId||null,source_kind:"vignette",front:`${v.stem}\n\n${v.lead_in}\n\n${(v.options||[]).join("\n")}`,back:`Answer: ${v.answer}\n\n${v.rationale||""}`}));
  const { error } = await sb.from("cards").insert(cards);
  if(error && !String(error.message).includes("duplicate key")) return NextResponse.json({ok:false,error:error.message},{status:500});
  const { count } = await sb.from("cards").select("*",{count:"exact",head:true}).eq("user_id",userId).eq("block_id",blockId);
  return NextResponse.json({ok:true,total:count||0});
}
