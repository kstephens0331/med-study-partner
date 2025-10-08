// Enforce "no rubber-stamping" and keep replies tight & actionable.
export function sanitizeLLM(text: string): string {
  let t = text || "";

  // Remove praise/grades-like phrasing
  t = t.replace(/\b(correct|incorrect|good job|great|well done|perfect)\b/gi, "").trim();

  // Ensure at least one probing question
  if (!/[?]/.test(t)) {
    t += "\n\nQuick probe: what's the immediate next step, and why?";
  }

  // Keep it concise in MVP
  if (t.length > 900) t = t.slice(0, 900) + "\n…(continue if needed)";
  return t;
}
