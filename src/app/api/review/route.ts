import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supaAdmin } from "@/lib/supabaseServer";
import { sm2Step, nowPlusDays, type SM2State } from "@/lib/srs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Get authenticated user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { cardId, quality } = await req.json();

  if (!cardId || typeof quality !== "number") {
    return NextResponse.json(
      { ok: false, error: "Missing cardId or quality" },
      { status: 400 }
    );
  }

  // Validate quality is 0-5
  if (quality < 0 || quality > 5) {
    return NextResponse.json(
      { ok: false, error: "Quality must be between 0 and 5" },
      { status: 400 }
    );
  }

  try {
    const adminClient = supaAdmin();

    // Get current mastery state for this card
    const { data: masteryData, error: masteryError } = await adminClient
      .from("mastery")
      .select("*")
      .eq("user_id", user.id)
      .eq("card_id", cardId)
      .maybeSingle();

    // Create initial state if doesn't exist
    const currentState: SM2State = masteryData
      ? {
          interval_days: masteryData.interval_days,
          ease: masteryData.ease,
          reps: masteryData.reps,
          lapses: masteryData.lapses,
        }
      : {
          interval_days: 1,
          ease: 2.5,
          reps: 0,
          lapses: 0,
        };

    // Calculate next state using SM2 algorithm
    const { next, newInterval, wasLapse } = sm2Step(currentState, quality);
    const dueAt = nowPlusDays(newInterval);

    // Upsert mastery record
    const { error: upsertError } = await adminClient
      .from("mastery")
      .upsert({
        user_id: user.id,
        card_id: cardId,
        interval_days: next.interval_days,
        ease: next.ease,
        reps: next.reps,
        lapses: next.lapses,
        due_at: dueAt,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Failed to update mastery:", upsertError);
      return NextResponse.json(
        { ok: false, error: "Failed to update mastery" },
        { status: 500 }
      );
    }

    // Record the review in reviews table
    const { error: reviewError } = await adminClient.from("reviews").insert({
      user_id: user.id,
      card_id: cardId,
      quality,
      reviewed_at: new Date().toISOString(),
    });

    if (reviewError) {
      console.error("Failed to record review:", reviewError);
      // Don't fail the request if review recording fails
    }

    return NextResponse.json({
      ok: true,
      nextReview: dueAt,
      newInterval: newInterval,
      wasLapse,
      ease: next.ease,
    });
  } catch (e: any) {
    console.error("Review error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
