import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { sanitizeLLM } from "@/lib/ai/policyFilter";

const USE_LLM = (process.env.USE_LLM || "true") === "true";
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || "";
const TOGETHER_MODEL =
  process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const {
    transcript,
    weakTags,
    priorMessages,
    deckContext,
    deckKeywords,
    topicLock,
    classPersona,
  } = await req.json();

  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({
      text: "Give me 30–90 seconds on one slice; I’ll probe you right after.",
    });
  }

  if (!USE_LLM || !TOGETHER_API_KEY) {
    return NextResponse.json({
      text: sanitizeLLM(makeFallbackProbe(transcript, weakTags)),
    });
  }

  try {
    const topicPreamble =
      topicLock && deckContext
        ? `You are LIMITED to the following deck context (do not invent beyond it unless asked):\n"""${deckContext}"""\nKey terms: ${(deckKeywords || [])
            .slice(0, 15)
            .join(", ")}\n\n`
        : "";

    const classPreamble = classPersona
      ? `Classroom participants (use as voices to ask questions one at a time; emulate raise-hand dynamics):\n${classPersona}\n\n`
      : "";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(priorMessages) ? priorMessages.slice(-8) : []),
      {
        role: "user" as const,
        content:
          `${topicPreamble}${classPreamble}` +
          `Learner said:\n"""${transcript}"""\n` +
          `Weak tags to target: ${(weakTags || []).join(", ") || "none"}\n` +
          `Respond as ONE voice at a time (Coach or ONE student). Use ONE probe or micro-case; optionally one-line specificity nudge; occasionally ask for a 20-sec teach-back.`,
      },
    ];

    const payload = {
      model: TOGETHER_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 512,
    };

    const resp = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const _msg = await resp.text();
      const text =
        makeFallbackProbe(transcript, weakTags) +
        `\n\n(note: LLM error ${resp.status})`;
      return NextResponse.json({ text: sanitizeLLM(text) });
    }

    const data = await resp.json();
    const modelText =
      data?.choices?.[0]?.message?.content ||
      "Give me a 60-sec explanation; I’ll probe next.";
    return NextResponse.json({ text: sanitizeLLM(modelText) });
  } catch (e: any) {
    const text =
      makeFallbackProbe(transcript, weakTags) +
      `\n\n(note: ${e?.message || "LLM error"})`;
    return NextResponse.json({ text: sanitizeLLM(text) });
  }
}

function makeFallbackProbe(_transcript: string, weakTags?: string[]) {
  const stems = [
    "Walk me step-by-step from tissue factor exposure to thrombin burst. Where does VIII enter?",
    "Compute expected PaCO₂ with Winters’ for HCO₃⁻=12. What value would suggest a mixed disorder?",
    "Immediate next action in hypotensive chest pain with O₂ 89%? Name one life-threat to exclude now.",
    "Give two high-anion gap causes that mimic your case and one lab to separate them.",
  ];
  const nudge =
    Math.random() < 0.5
      ? "Be specific: list names, numbers, and order of steps."
      : "Keep it to 45 seconds—one clear next action.";

  const tb =
    Math.random() < 0.5
      ? "\n\n20-sec teach-back: explain one sub-step as if to a junior student."
      : "";

  return `${stems[Math.floor(Math.random() * stems.length)]}\n\n${nudge}${tb}`;
}
