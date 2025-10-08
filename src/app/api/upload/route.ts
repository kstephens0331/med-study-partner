import { NextRequest, NextResponse } from "next/server";
import { extractFromPptx } from "@/lib/ingest/pptx";
import { extractFromPdf } from "@/lib/ingest/pdf";

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
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  let fullText = "";
  let outline: string[] = [];

  try {
    if (name.endsWith(".pptx")) {
      const deck = await extractFromPptx(buf);
      fullText = deck.fullText;
      outline = deck.outline;
    } else if (name.endsWith(".pdf")) {
      const pdf = await extractFromPdf(buf);
      fullText = pdf.fullText;
      outline = pdf.outline;
    } else {
      return NextResponse.json({ error: "Unsupported file type (use .pptx or .pdf)" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Parse failed: ${e?.message || "unknown error"}` }, { status: 500 });
  }

  // Trim and compute keywords
  const context = fullText.slice(0, MAX_LEN);
  const keywords = topKeywords(context, 30);

  return NextResponse.json({
    ok: true,
    name: file.name,
    bytes: file.size,
    outline,
    keywords,
    context,
  });
}
