// Minimal per-device "weak tag" memory; replace with DB later if you like.
export type SkillTag = { tag: string; confidence: number; lastSeen: number };
const KEY = "med_skill_map_v1";

export function loadSkillMap(): Record<string, SkillTag> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function bump(tag: string, delta: number) {
  const m = loadSkillMap();
  const curr = m[tag] || { tag, confidence: 3, lastSeen: Date.now() };
  const next = Math.min(5, Math.max(1, curr.confidence + delta));
  m[tag] = { tag, confidence: next, lastSeen: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(m));
}

export function weakest(n = 3): string[] {
  const m = Object.values(loadSkillMap());
  if (!m.length) return ["heme:coag-initiation","renal:anion-gap","cards:acs"];
  return m.sort((a,b)=>a.confidence-b.confidence || a.lastSeen-b.lastSeen).slice(0,n).map(x=>x.tag);
}
