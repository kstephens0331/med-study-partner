"use client";

import { useState } from "react";
import { randomCase, type MicroCase } from "@/lib/ai/caseBank";

const SYSTEMS = [
  { id: "heme", label: "Hematology" },
  { id: "renal", label: "Renal" },
  { id: "cards", label: "Cardiology" },
  { id: "pulm", label: "Pulmonology" },
  { id: "neuro", label: "Neurology" },
  { id: "endo", label: "Endocrinology" },
  { id: "gi", label: "Gastroenterology" },
  { id: "micro", label: "Microbiology" },
  { id: "pharm", label: "Pharmacology" },
];

type VignetteWithAnswer = MicroCase & {
  id: string;
  answer: string;
  revealed: boolean;
};

export default function VignetteBank() {
  const [vignettes, setVignettes] = useState<VignetteWithAnswer[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

  function generateVignette(system: string) {
    const microCase = randomCase(system);
    const newVignette: VignetteWithAnswer = {
      ...microCase,
      id: `${Date.now()}-${Math.random()}`,
      answer: "[Your answer here - think through the case step by step]",
      revealed: false,
    };
    setVignettes([newVignette, ...vignettes]);
  }

  function toggleReveal(id: string) {
    setVignettes(
      vignettes.map((v) =>
        v.id === id ? { ...v, revealed: !v.revealed } : v
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

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Clinical Vignette Bank</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Generate NBME/USMLE-style micro-cases for practice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-zinc-400">{vignettes.length} cases</div>
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

      {/* System Selector */}
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 text-sm font-medium text-zinc-300">Generate Case By System</div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5 lg:grid-cols-9">
          {SYSTEMS.map((system) => (
            <button
              key={system.id}
              onClick={() => generateVignette(system.id)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-emerald-600 hover:bg-emerald-900/20"
            >
              {system.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      {vignettes.length > 0 && (
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
      {filteredVignettes.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12">
          <div className="text-center">
            <div className="mb-2 text-lg text-zinc-300">No vignettes yet</div>
            <div className="text-sm text-zinc-500">
              Click a system above to generate a clinical case
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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

              {/* Case Prompt */}
              <div className="mb-4 rounded-lg bg-zinc-950/50 p-4">
                <div className="whitespace-pre-wrap text-zinc-100">{vignette.prompt}</div>
              </div>

              {/* Answer Section */}
              <div className="space-y-3">
                {!vignette.revealed ? (
                  <button
                    onClick={() => toggleReveal(vignette.id)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Show Approach Framework
                  </button>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Approach Framework
                      </div>
                      <div className="space-y-2 text-sm text-zinc-300">
                        <div>
                          <span className="font-medium text-emerald-400">1. Key Findings:</span>{" "}
                          Identify critical vitals, labs, or physical exam findings
                        </div>
                        <div>
                          <span className="font-medium text-emerald-400">2. Differential:</span>{" "}
                          List 2-3 likely diagnoses based on presentation
                        </div>
                        <div>
                          <span className="font-medium text-emerald-400">3. Next Step:</span>{" "}
                          Immediate action (stabilize vs. diagnose vs. treat)
                        </div>
                        <div>
                          <span className="font-medium text-emerald-400">4. Confirmation:</span>{" "}
                          Diagnostic test to confirm leading diagnosis
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleReveal(vignette.id)}
                      className="mt-2 text-sm text-zinc-500 hover:text-zinc-300"
                    >
                      Hide framework
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
