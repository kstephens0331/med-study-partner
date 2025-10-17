import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { front, back, sourceKind, materialId, lectureId } = await req.json();

    if (!front || !back) {
      return NextResponse.json(
        { error: "Front and back are required" },
        { status: 400 }
      );
    }

    // Create the card
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .insert({
        user_id: user.id,
        front,
        back,
        source_kind: sourceKind || "direct",
        material_id: materialId || null,
        lecture_id: lectureId || null,
      })
      .select()
      .single();

    if (cardError) {
      console.error("Error creating card:", cardError);
      return NextResponse.json(
        { error: "Failed to create card" },
        { status: 500 }
      );
    }

    // Initialize mastery state for the new card
    const { error: masteryError } = await supabase
      .from("mastery")
      .insert({
        user_id: user.id,
        card_id: card.id,
        interval_days: 1,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        due_at: new Date().toISOString(),
      });

    if (masteryError) {
      console.error("Error creating mastery:", masteryError);
      // Don't fail the request if mastery creation fails
    }

    return NextResponse.json({ card });
  } catch (e: any) {
    console.error("Error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
