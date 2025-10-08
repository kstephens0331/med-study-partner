import pdf from "pdf-parse";

export async function extractFromPdf(buf: ArrayBuffer): Promise<{ fullText: string; outline: string[] }> {
  const data = await pdf(Buffer.from(buf));
  const fullText = (data.text || "").replace(/\r/g, "").trim();
  const lines: string[] = fullText.split("\n").map((s: string) => s.trim()).filter(Boolean);
  const outline = lines.slice(0, 50);
  return { fullText, outline };
}
