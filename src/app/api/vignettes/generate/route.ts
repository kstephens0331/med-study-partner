import { NextRequest, NextResponse } from "next/server";
import { createServerClient, supaAdmin } from "@/lib/supabaseServer";
import { batchGenerateVignettes } from "@/lib/ai/vignetteGenerator";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for batch generation

/**
 * POST /api/vignettes/generate
 *
 * Generates USMLE-style vignettes from uploaded material content
 *
 * Body:
 * {
 *   materialId: string,  // Material to generate from
 *   count: number,       // Number of vignettes to generate (default: 20)
 *   blockId?: string     // Optional block association
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId, count = 20, blockId } = await req.json();

    if (!materialId) {
      return NextResponse.json({ error: "materialId is required" }, { status: 400 });
    }

    // Fetch material content
    const adminClient = supaAdmin();
    const { data: material, error: materialError } = await adminClient
      .from("materials")
      .select("id, title, content_text, user_id, block_id")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (!material.content_text || material.content_text.length < 500) {
      return NextResponse.json(
        { error: "Material content too short to generate vignettes (minimum 500 characters)" },
        { status: 400 }
      );
    }

    // Generate vignettes using AI
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    console.log(`Generating ${count} vignettes from material: ${material.title}`);

    const generatedVignettes = await batchGenerateVignettes(
      material.content_text,
      count,
      apiKey
    );

    if (generatedVignettes.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate vignettes. Content may not be suitable for clinical questions." },
        { status: 500 }
      );
    }

    // Save vignettes to database
    const vignettesToInsert = generatedVignettes.map((v: any) => ({
      user_id: user.id,
      block_id: blockId || material.block_id,
      material_id: material.id,
      prompt: v.prompt,
      labs: v.labs || [],
      vitals: v.vitals || {},
      choices: v.choices,
      correct_answer: v.correctAnswer,
      explanation: v.explanation,
      comparison_table: v.comparisonTable || null,
      tags: v.tags || [],
      system: v.system || "general",
      topic: v.topic || "unknown",
      difficulty: v.difficulty || "moderate",
    }));

    const { data: savedVignettes, error: insertError } = await adminClient
      .from("generated_vignettes")
      .insert(vignettesToInsert)
      .select();

    if (insertError) {
      console.error("Error saving vignettes:", insertError);
      return NextResponse.json(
        { error: "Failed to save generated vignettes", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      count: savedVignettes?.length || 0,
      vignettes: savedVignettes,
      material: {
        id: material.id,
        title: material.title
      }
    });

  } catch (error: any) {
    console.error("Vignette generation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vignettes/generate?materialId=xxx
 *
 * Check generation status or retrieve generated vignettes
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId");
    const blockId = searchParams.get("blockId");

    const adminClient = supaAdmin();
    let query = adminClient
      .from("generated_vignettes")
      .select("*")
      .eq("user_id", user.id);

    if (materialId) {
      query = query.eq("material_id", materialId);
    }

    if (blockId) {
      query = query.eq("block_id", blockId);
    }

    const { data: vignettes, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: vignettes?.length || 0,
      vignettes: vignettes || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
