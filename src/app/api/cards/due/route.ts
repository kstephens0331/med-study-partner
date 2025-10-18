import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Get authenticated user and session
  const supabase = await createServerClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;

  try {
    // Get all cards with their mastery state for this user
    const { data: cards, error } = await supabase
      .from("cards")
      .select(`
        id,
        front,
        back,
        source_kind,
        created_at,
        mastery (
          interval_days,
          ease,
          reps,
          lapses,
          due_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching cards:", error);
      return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
    }

    // Filter for cards that are due (or new cards without mastery)
    const now = new Date();
    const dueCards = (cards || []).filter((card: any) => {
      if (!card.mastery || card.mastery.length === 0) {
        // New card, always due
        return true;
      }
      const masteryState = card.mastery[0];
      const dueDate = new Date(masteryState.due_at);
      return dueDate <= now;
    });

    // Flatten mastery data
    const formattedCards = dueCards.map((card: any) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      source_kind: card.source_kind,
      created_at: card.created_at,
      mastery: card.mastery?.[0] || null,
    }));

    return NextResponse.json({
      cards: formattedCards,
      count: formattedCards.length,
    });
  } catch (e: any) {
    console.error("Error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
