import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "t",
});

export type DeckExtraction = {
  slides: { index: number; text: string }[];
  outline: string[];
  fullText: string;
};

export async function extractFromPptx(buf: ArrayBuffer): Promise<DeckExtraction> {
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((p) => p.startsWith("ppt/slides/slide") && p.endsWith(".xml"))
    .sort((a, b) => {
      const ai = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
      const bi = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
      return ai - bi;
    });

  const slides: { index: number; text: string }[] = [];

  for (const path of slideFiles) {
    const xml = await zip.files[path].async("string");
    const json = parser.parse(xml);
    // Text in PPTX slides typically under p:txBody > a:p > a:r > a:t
    const textRuns: string[] = [];
    const tree = json["p:sld"]?.["p:cSld"]?.["p:spTree"];
    if (tree) {
      const shapes = Array.isArray(tree["p:sp"]) ? tree["p:sp"] : [tree["p:sp"]].filter(Boolean);
      for (const sp of shapes) {
        const tb = sp?.["p:txBody"];
        if (!tb) continue;
        const paras = Array.isArray(tb["a:p"]) ? tb["a:p"] : [tb["a:p"]].filter(Boolean);
        for (const p of paras) {
          const runs = Array.isArray(p?.["a:r"]) ? p["a:r"] : [p?.["a:r"]].filter(Boolean);
          if (runs.length) {
            for (const r of runs) {
              const t = r?.["a:t"];
              if (typeof t === "string") textRuns.push(t);
            }
          } else {
            // Sometimes text is in a:p/a:fld or a:p/a:ph – catch simple strings.
            const t = p?.["a:t"];
            if (typeof t === "string") textRuns.push(t);
          }
        }
      }
    }
    const txt = textRuns.join(" ").replace(/\s+/g, " ").trim();
    const idx = parseInt(path.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
    slides.push({ index: idx, text: txt });
  }

  const fullText = slides.map(s => s.text).join("\n");
  // naive outline: take first line-ish per slide (up to 120 chars)
  const outline = slides.map(s => (s.text || "").slice(0, 120));

  return { slides, outline, fullText };
}
