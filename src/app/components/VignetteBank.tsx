"use client";

import { useState, useEffect } from "react";
import { randomCase, type MicroCase } from "@/lib/ai/caseBank";
import VignetteGenerator from "./VignetteGenerator";

const SYSTEMS = [
  { id: "heme", label: "Hematology", complete: true },
  { id: "renal", label: "Renal", complete: true },
  { id: "cards", label: "Cardiology", complete: true },
  { id: "neuro", label: "Neurology", complete: true },
  { id: "pulm", label: "Pulmonology", complete: true },
  { id: "endo", label: "Endocrinology", complete: false },
  { id: "gi", label: "Gastroenterology", complete: false },
  { id: "micro", label: "Microbiology", complete: false },
  { id: "pharm", label: "Pharmacology", complete: false },
  { id: "genetics", label: "Genetics", complete: false },
  { id: "obgyn", label: "OB/GYN", complete: false },
  { id: "psych", label: "Psychiatry", complete: false },
  { id: "peds", label: "Pediatrics", complete: false },
];

type VignetteWithAnswer = MicroCase & {
  id: string;
  selectedAnswer: string | null;
  revealed: boolean;
};

export default function VignetteBank() {
  const [vignettes, setVignettes] = useState<VignetteWithAnswer[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  async function generateVignette(system: string) {
    const microCase = randomCase(system);
    const newVignette: VignetteWithAnswer = {
      ...microCase,
      id: `${Date.now()}-${Math.random()}`,
      selectedAnswer: null,
      revealed: false,
    };
    setVignettes([newVignette, ...vignettes]);
  }

  async function loadGeneratedVignettes() {
    try {
      const res = await fetch("/api/vignettes/generate");
      const data = await res.json();
      if (data.ok && data.vignettes) {
        const formatted: VignetteWithAnswer[] = data.vignettes.map((v: any) => ({
          id: v.id,
          prompt: v.prompt,
          labs: v.labs,
          vitals: v.vitals,
          choices: v.choices,
          correctAnswer: v.correct_answer,
          explanation: v.explanation,
          comparisonTable: v.comparison_table,
          tags: v.tags,
          selectedAnswer: null,
          revealed: false,
        }));
        setVignettes([...formatted, ...vignettes]);
      }
    } catch (e) {
      console.error("Failed to load generated vignettes:", e);
    }
  }

  function selectAnswer(id: string, answer: string) {
    setVignettes(
      vignettes.map((v) =>
        v.id === id ? { ...v, selectedAnswer: answer, revealed: false } : v
      )
    );
  }

  function submitAnswer(id: string) {
    setVignettes(
      vignettes.map((v) =>
        v.id === id ? { ...v, revealed: true } : v
      )
    );
  }

  function removeVignette(id: string) {
    setVignettes(vignettes.filter((v) => v.id !== id));
  }

  function clearAll() {
    if (confirm("Clear all vignettes?")) {
      setVignettes([]);
    }
  }

  const filteredVignettes = selectedSystem
    ? vignettes.filter((v) =>
        v.tags.some((tag) => tag.startsWith(`${selectedSystem}:`))
      )
    : vignettes;

  // Load generated vignettes on mount
  useEffect(() => {
    loadGeneratedVignettes();
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">USMLE-Style Vignette Bank</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Generate NBME/USMLE-style clinical vignettes with detailed explanations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-zinc-400">{vignettes.length} cases</div>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-500"
          >
            🤖 AI Generate from Materials
          </button>
          {vignettes.length > 0 && (
            <button
              onClick={clearAll}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      {showGenerator && (
        <div className="mb-6">
          <VignetteGenerator />
          <button
            onClick={() => setShowGenerator(false)}
            className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 underline"
          >
            Close Generator
          </button>
        </div>
      )}

      {/* System Selector */}
      {!showGenerator && (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 text-sm font-medium text-zinc-300">Generate Case By System</div>
        <div className="mb-3 text-xs text-zinc-500">
          ✅ = Full USMLE depth available • 🚧 = Under development
        </div>
        <div className="flex flex-wrap gap-2">
          {SYSTEMS.map((system) => (
            <button
              key={system.id}
              onClick={() => generateVignette(system.id)}
              className={`rounded-lg border px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${
                system.complete
                  ? "border-emerald-700 bg-emerald-900/20 text-emerald-200 hover:border-emerald-600 hover:bg-emerald-900/30"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-700"
              }`}
            >
              {system.complete ? "✅ " : "🚧 "}{system.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Filter */}
      {!showGenerator && vignettes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-400">Filter:</span>
          <button
            onClick={() => setSelectedSystem(null)}
            className={`rounded-full px-3 py-1 text-xs ${
              selectedSystem === null
                ? "bg-emerald-600 text-white"
                : "border border-zinc-700 bg-zinc-800 text-zinc-300"
            }`}
          >
            All
          </button>
          {SYSTEMS.map((system) => (
            <button
              key={system.id}
              onClick={() => setSelectedSystem(system.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                selectedSystem === system.id
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-700 bg-zinc-800 text-zinc-300"
              }`}
            >
              {system.label}
            </button>
          ))}
        </div>
      )}

      {/* Vignette List */}
      {!showGenerator && filteredVignettes.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12">
          <div className="text-center">
            <div className="mb-2 text-lg text-zinc-300">No vignettes yet</div>
            <div className="text-sm text-zinc-500">
              Click a system above to generate a USMLE-style clinical case
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredVignettes.map((vignette, index) => (
            <div
              key={vignette.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-zinc-400">
                    Case #{vignettes.length - index}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {vignette.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => removeVignette(vignette.id)}
                  className="text-zinc-500 hover:text-rose-400"
                  title="Remove"
                >
                  ✕
                </button>
              </div>

              {/* Clinical Vignette */}
              <div className="mb-6 rounded-lg bg-zinc-950/50 p-5">
                <div className="whitespace-pre-wrap text-base leading-relaxed text-zinc-100">
                  {vignette.prompt}
                </div>
              </div>

              {/* Labs & Vitals Tables */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                {/* Labs Table */}
                {vignette.labs && vignette.labs.length > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="mb-3 text-sm font-semibold text-zinc-300">Laboratory Results</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="pb-2 text-left font-medium text-zinc-400">Test</th>
                            <th className="pb-2 text-left font-medium text-zinc-400">Result</th>
                            <th className="pb-2 text-left font-medium text-zinc-400">Reference Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vignette.labs.map((lab, idx) => (
                            <tr key={idx} className="border-b border-zinc-900 last:border-0">
                              <td className="py-2 text-zinc-300">{lab.test}</td>
                              <td className="py-2 font-medium text-zinc-100">{lab.result}</td>
                              <td className="py-2 text-xs text-zinc-500">{lab.referenceRange}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Vitals Table */}
                {vignette.vitals && Object.keys(vignette.vitals).length > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="mb-3 text-sm font-semibold text-zinc-300">Vital Signs</div>
                    <div className="space-y-2 text-sm">
                      {Object.entries(vignette.vitals).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-zinc-400">{key}:</span>
                          <span className="font-medium text-zinc-100">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multiple Choice Options */}
              <div className="mb-6">
                <div className="mb-3 text-sm font-medium text-zinc-300">Select your answer:</div>
                <div className="space-y-2">
                  {vignette.choices.map((choice) => {
                    const isSelected = vignette.selectedAnswer === choice.label;
                    const isCorrect = choice.label === vignette.correctAnswer;
                    const showResult = vignette.revealed;

                    return (
                      <button
                        key={choice.label}
                        onClick={() => !vignette.revealed && selectAnswer(vignette.id, choice.label)}
                        disabled={vignette.revealed}
                        className={`w-full rounded-lg border p-4 text-left transition-all ${
                          showResult && isCorrect
                            ? "border-emerald-600 bg-emerald-900/20"
                            : showResult && isSelected && !isCorrect
                            ? "border-rose-600 bg-rose-900/20"
                            : isSelected
                            ? "border-emerald-600 bg-emerald-900/10"
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        } ${vignette.revealed ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                            showResult && isCorrect
                              ? "border-emerald-500 bg-emerald-600 text-white"
                              : showResult && isSelected && !isCorrect
                              ? "border-rose-500 bg-rose-600 text-white"
                              : isSelected
                              ? "border-emerald-500 bg-emerald-600 text-white"
                              : "border-zinc-600 bg-zinc-800 text-zinc-400"
                          }`}>
                            {choice.label}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm ${
                              showResult && (isCorrect || (isSelected && !isCorrect))
                                ? "font-medium text-white"
                                : "text-zinc-200"
                            }`}>
                              {choice.text}
                            </div>
                            {showResult && isCorrect && (
                              <div className="mt-1 text-xs text-emerald-400">✓ Correct Answer</div>
                            )}
                            {showResult && isSelected && !isCorrect && (
                              <div className="mt-1 text-xs text-rose-400">✗ Incorrect</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit/Explanation Section */}
              {!vignette.revealed ? (
                <button
                  onClick={() => vignette.selectedAnswer && submitAnswer(vignette.id)}
                  disabled={!vignette.selectedAnswer}
                  className={`w-full rounded-lg px-6 py-3 font-medium transition-colors ${
                    vignette.selectedAnswer
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "cursor-not-allowed bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {vignette.selectedAnswer ? "Submit Answer & Show Explanation" : "Select an answer to continue"}
                </button>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                  {/* Result Badge */}
                  <div className={`rounded-lg border p-4 ${
                    vignette.selectedAnswer === vignette.correctAnswer
                      ? "border-emerald-700 bg-emerald-900/20"
                      : "border-rose-700 bg-rose-900/20"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${
                        vignette.selectedAnswer === vignette.correctAnswer
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}>
                        {vignette.selectedAnswer === vignette.correctAnswer ? "✓" : "✗"}
                      </div>
                      <div>
                        <div className={`font-semibold ${
                          vignette.selectedAnswer === vignette.correctAnswer
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }`}>
                          {vignette.selectedAnswer === vignette.correctAnswer ? "Correct!" : "Incorrect"}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {vignette.selectedAnswer === vignette.correctAnswer
                            ? "Great job! Review the explanation below to reinforce your understanding."
                            : `The correct answer is ${vignette.correctAnswer}. Review the explanation below.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Explanation */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="text-lg font-semibold text-emerald-400">
                        ✅ Answer: {vignette.correctAnswer}
                      </div>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div
                        className="whitespace-pre-wrap leading-relaxed text-zinc-200"
                        dangerouslySetInnerHTML={{
                          __html: vignette.explanation
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>')
                            .replace(/---/g, '<hr class="my-4 border-zinc-800" />')
                        }}
                      />
                    </div>
                  </div>

                  {/* Comparison Table (if exists) */}
                  {vignette.comparisonTable && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6">
                      <div className="mb-4 text-lg font-semibold text-zinc-300">
                        📊 {vignette.comparisonTable.title}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              {vignette.comparisonTable.headers.map((header, idx) => (
                                <th key={idx} className="pb-3 text-left font-semibold text-zinc-400 px-3">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vignette.comparisonTable.rows.map((row, idx) => (
                              <tr key={idx} className="border-b border-zinc-900 last:border-0">
                                {vignette.comparisonTable!.headers.map((header, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className={`py-3 px-3 ${
                                      cellIdx === 0
                                        ? "font-medium text-zinc-100"
                                        : "text-zinc-300"
                                    }`}
                                  >
                                    {row[header]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Reset Button */}
                  <button
                    onClick={() => setVignettes(vignettes.map(v =>
                      v.id === vignette.id ? { ...v, selectedAnswer: null, revealed: false } : v
                    ))}
                    className="text-sm text-zinc-500 hover:text-zinc-300 underline"
                  >
                    Reset and try again
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
