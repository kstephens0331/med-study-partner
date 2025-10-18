import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supaAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Get authenticated user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Use service role client for database queries (bypasses RLS)
    // since we're already doing manual authorization above
    console.log("SUPABASE_SERVICE_ROLE exists:", !!process.env.SUPABASE_SERVICE_ROLE);
    console.log("User ID:", user.id);

    const adminClient = supaAdmin();
    const { data: materials, error } = await adminClient
      .from("materials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false});

    if (error) {
      console.error("Error fetching materials:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
    }

    return NextResponse.json({
      materials: materials || [],
      count: materials?.length || 0,
    });
  } catch (e: any) {
    console.error("Error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
