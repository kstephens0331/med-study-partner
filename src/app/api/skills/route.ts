import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// GET - Fetch user's skill progress
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: skills, error } = await supabase
      .from("skill_progress")
      .select("*")
      .eq("user_id", user.id)
      .order("last_reviewed_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching skills:", error);
      return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
    }

    return NextResponse.json({
      skills: skills || [],
      count: skills?.length || 0,
    });
  } catch (e: any) {
    console.error("Error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}

// POST - Update skill progress
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topicTag, correct, incorrect } = await req.json();

    if (!topicTag) {
      return NextResponse.json({ error: "Missing topicTag" }, { status: 400 });
    }

    // Fetch current skill progress
    const { data: existing, error: fetchError } = await supabase
      .from("skill_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic_tag", topicTag)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching skill:", fetchError);
      return NextResponse.json({ error: "Failed to fetch skill" }, { status: 500 });
    }

    const currentCorrect = existing?.correct_count || 0;
    const currentIncorrect = existing?.incorrect_count || 0;

    // Calculate new counts
    const newCorrect = currentCorrect + (correct || 0);
    const newIncorrect = currentIncorrect + (incorrect || 0);

    // Upsert skill progress
    const { data: updated, error: upsertError } = await supabase
      .from("skill_progress")
      .upsert({
        user_id: user.id,
        topic_tag: topicTag,
        correct_count: newCorrect,
        incorrect_count: newIncorrect,
        last_reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Error updating skill:", upsertError);
      return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
    }

    return NextResponse.json({ skill: updated });
  } catch (e: any) {
    console.error("Error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
