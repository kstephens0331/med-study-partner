import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * GET /api/vignettes/base
 *
 * Retrieves vignettes from the global base question bank (4,000-4,500 questions)
 * Available to ALL students across all schools
 *
 * Query parameters:
 * - system: Filter by system (heme, renal, cards, etc.)
 * - difficulty: Filter by difficulty (easy, moderate, hard)
 * - topic: Filter by specific topic
 * - limit: Number of vignettes to return (default: 20, max: 100)
 * - random: If true, returns random selection (default: false)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { searchParams } = new URL(req.url);
    const system = searchParams.get("system");
    const difficulty = searchParams.get("difficulty");
    const topic = searchParams.get("topic");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const random = searchParams.get("random") === "true";

    let query = supabase
      .from("base_vignettes")
      .select("*");

    // Apply filters
    if (system) {
      query = query.eq("system", system);
    }

    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    if (topic) {
      query = query.eq("topic", topic);
    }

    // Limit
    query = query.limit(limit);

    // Random selection (PostgreSQL random() function)
    if (random) {
      // Get total count first
      const { count } = await supabase
        .from("base_vignettes")
        .select("*", { count: "exact", head: true });

      if (count && count > limit) {
        // Get random offset
        const randomOffset = Math.floor(Math.random() * (count - limit));
        query = query.range(randomOffset, randomOffset + limit - 1);
      }
    } else {
      // Default: order by created_at
      query = query.order("created_at", { ascending: false });
    }

    const { data: vignettes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: vignettes?.length || 0,
      vignettes: vignettes || [],
      source: "base_question_bank"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/vignettes/base/stats
 *
 * Returns statistics about the base question bank
 */
export async function HEAD(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: stats, error } = await supabase
      .from("base_vignettes_stats")
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase
      .from("base_vignettes")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      ok: true,
      total_vignettes: count || 0,
      by_system: stats || [],
      target: 4550,
      progress: count ? Math.round((count / 4550) * 100) : 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
