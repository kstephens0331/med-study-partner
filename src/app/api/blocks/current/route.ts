// src/app/api/blocks/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supaAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Get authenticated user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { name, startDate, endDate } = await req.json();

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const adminClient = supaAdmin();

  // Check if block already exists
  const { data: existing } = await adminClient
    .from("blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, block: existing });
  }

  // Create new block
  const { data, error } = await adminClient
    .from("blocks")
    .insert({
      user_id: user.id,
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, block: data });
}
