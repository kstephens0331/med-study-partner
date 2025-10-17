// Database-backed skill tracking with localStorage fallback
export type SkillTag = { tag: string; confidence: number; lastSeen: number };
const KEY = "med_skill_map_v1";

// Local cache for client-side performance
let skillCache: Record<string, SkillTag> | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute

// Load from localStorage (fallback)
function loadLocalSkillMap(): Record<string, SkillTag> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

// Save to localStorage (fallback)
function saveLocalSkillMap(map: Record<string, SkillTag>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

// Fetch skills from database
async function fetchSkillsFromDB(): Promise<Record<string, SkillTag>> {
  try {
    const res = await fetch("/api/skills");
    if (!res.ok) throw new Error("Failed to fetch skills");

    const data = await res.json();
    const skillMap: Record<string, SkillTag> = {};

    (data.skills || []).forEach((skill: any) => {
      // Convert database format to SkillTag format
      const total = skill.correct_count + skill.incorrect_count;
      const confidence = total === 0
        ? 3
        : Math.round((skill.correct_count / total) * 5);

      skillMap[skill.topic_tag] = {
        tag: skill.topic_tag,
        confidence: Math.max(1, Math.min(5, confidence)),
        lastSeen: new Date(skill.last_reviewed_at || Date.now()).getTime(),
      };
    });

    return skillMap;
  } catch (e) {
    console.error("Failed to fetch skills from DB, using localStorage:", e);
    return loadLocalSkillMap();
  }
}

// Load skill map (with caching)
export async function loadSkillMap(): Promise<Record<string, SkillTag>> {
  // Use cache if fresh
  if (skillCache && Date.now() - lastFetch < CACHE_TTL) {
    return skillCache;
  }

  // Fetch from database
  const skills = await fetchSkillsFromDB();
  skillCache = skills;
  lastFetch = Date.now();

  return skills;
}

// Synchronous version for backwards compatibility (uses cache or localStorage)
export function loadSkillMapSync(): Record<string, SkillTag> {
  if (skillCache) return skillCache;
  return loadLocalSkillMap();
}

// Update skill progress
export async function bump(tag: string, delta: number) {
  // Update local cache immediately for responsive UI
  const m = skillCache || loadLocalSkillMap();
  const curr = m[tag] || { tag, confidence: 3, lastSeen: Date.now() };
  const next = Math.min(5, Math.max(1, curr.confidence + delta));
  m[tag] = { tag, confidence: next, lastSeen: Date.now() };

  // Update cache
  skillCache = m;
  saveLocalSkillMap(m);

  // Update database in background
  try {
    const correct = delta > 0 ? 1 : 0;
    const incorrect = delta < 0 ? 1 : 0;

    await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicTag: tag,
        correct,
        incorrect,
      }),
    });
  } catch (e) {
    console.error("Failed to update skill in DB:", e);
  }
}

// Get weakest skills
export async function weakest(n = 3): Promise<string[]> {
  const m = await loadSkillMap();
  const skills = Object.values(m);

  if (!skills.length) {
    return ["heme:coag-initiation", "renal:anion-gap", "cards:acs"];
  }

  return skills
    .sort((a, b) => a.confidence - b.confidence || a.lastSeen - b.lastSeen)
    .slice(0, n)
    .map((x) => x.tag);
}

// Synchronous version for backwards compatibility
export function weakestSync(n = 3): string[] {
  const m = skillCache || loadLocalSkillMap();
  const skills = Object.values(m);

  if (!skills.length) {
    return ["heme:coag-initiation", "renal:anion-gap", "cards:acs"];
  }

  return skills
    .sort((a, b) => a.confidence - b.confidence || a.lastSeen - b.lastSeen)
    .slice(0, n)
    .map((x) => x.tag);
}

// Preload skills on app start
export async function preloadSkills() {
  try {
    await loadSkillMap();
  } catch (e) {
    console.error("Failed to preload skills:", e);
  }
}
