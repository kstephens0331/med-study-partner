import { NextRequest, NextResponse } from "next/server";

const MAX_BUFFER_CHARS = 6000;

export async function POST(req: NextRequest) {
  const { buffer } = await req.json();
  if (!buffer || typeof buffer !== "string") {
    return NextResponse.json({ summary: "" });
  }
  // Cheap client-side summary heuristic (no model): keep last N chars + first topic line.
  // Swap later for Together.ai call if you want model-quality summaries.
  const trimmed = buffer.slice(-MAX_BUFFER_CHARS);
  const firstLine = buffer.split("\n").find(Boolean) || "";
  const summary = [firstLine, "...", trimmed].join("\n");
  return NextResponse.json({ summary });
}
