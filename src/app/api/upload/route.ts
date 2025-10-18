import { NextRequest, NextResponse } from "next/server";
import { extractFromPptx } from "@/lib/ingest/pptx";
import { extractFromPdf } from "@/lib/ingest/pdf";
import { createServerClient, supaAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
const MAX_LEN = 12000; // cap context to keep LLM snappy

function topKeywords(text: string, k = 20): string[] {
  const stop = new Set(["the","and","of","to","in","a","for","with","on","by","as","is","at","or","be","an","are","that","from","this"]);
  const counts: Record<string, number> = {};
  text.toLowerCase().replace(/[^a-z0-9:\- ]+/g, " ").split(/\s+/).forEach(w => {
    if (!w || stop.has(w) || w.length < 3) return;
    counts[w] = (counts[w] || 0) + 1;
  });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,k).map(([w])=>w);
}

export async function POST(req: NextRequest) {
  // Get authenticated user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  let fullText = "";
  let outline: string[] = [];
  let fileType = "unknown";

  try {
    // Document files (.pptx, .pdf, .docx)
    if (name.endsWith(".pptx")) {
      const deck = await extractFromPptx(buf);
      fullText = deck.fullText;
      outline = deck.outline;
      fileType = "pptx";
    } else if (name.endsWith(".pdf")) {
      const pdf = await extractFromPdf(buf);
      fullText = pdf.fullText;
      outline = pdf.outline;
      fileType = "pdf";
    } else if (name.endsWith(".docx")) {
      // Use ingestor service for .docx files
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(process.env.NEXT_PUBLIC_INGESTOR_URL!, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      fullText = data.text || "";
      outline = data.outline || [];
      fileType = "docx";
    }
    // Audio/Video files (.mp3, .mp4, .m4a, .wav)
    else if (name.match(/\.(mp3|mp4|m4a|wav|webm|ogg)$/)) {
      // Use transcriber service for audio/video files
      const formData = new FormData();
      formData.append("audio", file);
      const response = await fetch(process.env.NEXT_PUBLIC_TRANSCRIBER_URL!, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      fullText = data.transcript || data.text || "";
      fileType = name.split(".").pop() || "audio";
    }
    // Text-based note files (.txt, .md, .note, etc.)
    else if (name.match(/\.(txt|md|markdown|note|notes|text)$/)) {
      const decoder = new TextDecoder("utf-8");
      fullText = decoder.decode(buf);
      fileType = name.split(".").pop() || "text";
    }
    // Unsupported file type
    else {
      return NextResponse.json({
        error: "Unsupported file type. Supported: .pptx, .pdf, .docx, .mp3, .mp4, .m4a, .wav, .txt, .md, .note"
      }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Parse failed: ${e?.message || "unknown error"}` }, { status: 500 });
  }

  // Trim and compute keywords
  const context = fullText.slice(0, MAX_LEN);
  const keywords = topKeywords(context, 30);

  // Save to database
  try {
    const adminClient = supaAdmin();
    const { data: material, error: dbError } = await adminClient
      .from("materials")
      .insert({
        user_id: user.id,
        title: file.name,
        file_type: fileType,
        content_text: fullText,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Failed to save material:", dbError);
      // Continue even if DB save fails - return extracted content
    }

    return NextResponse.json({
      ok: true,
      name: file.name,
      bytes: file.size,
      outline,
      keywords,
      context,
      materialId: material?.id,
    });
  } catch (e: any) {
    console.error("Database error:", e);
    // Return extracted content even if DB fails
    return NextResponse.json({
      ok: true,
      name: file.name,
      bytes: file.size,
      outline,
      keywords,
      context,
    });
  }
}
