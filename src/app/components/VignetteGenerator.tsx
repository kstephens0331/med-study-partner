"use client";

import { useState, useEffect } from "react";

type Material = {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
};

type GeneratedVignette = {
  id: string;
  prompt: string;
  choices: Array<{ label: string; text: string }>;
  correct_answer: string;
  system: string;
  difficulty: string;
  created_at: string;
};

export default function VignetteGenerator() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [vignetteCount, setVignetteCount] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [generatedVignettes, setGeneratedVignettes] = useState<GeneratedVignette[]>([]);
  const [error, setError] = useState("");

  async function loadMaterials() {
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      if (data.ok) {
        setMaterials(data.materials || []);
      }
    } catch (e: any) {
      setError("Failed to load materials");
    }
  }

  async function generateVignettes() {
    if (!selectedMaterial) {
      setError("Please select a material");
      return;
    }

    setGenerating(true);
    setError("");
    setProgress("Initializing AI vignette generation...");

    try {
      const res = await fetch("/api/vignettes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selectedMaterial,
          count: vignetteCount
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setProgress(`Successfully generated ${data.count} vignettes!`);
      setGeneratedVignettes(data.vignettes || []);

      // Refresh vignette bank
      setTimeout(() => {
        window.location.reload(); // Reload to show new vignettes in bank
      }, 2000);

    } catch (e: any) {
      setError(e.message || "Failed to generate vignettes");
      setProgress("");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">AI Vignette Generator</h2>
        <p className="text-sm text-zinc-400">
          Generate USMLE-style clinical vignettes from your uploaded study materials
        </p>
      </div>

      {/* Material Selection */}
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Select Material
          </label>
          {materials.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No materials uploaded yet. Upload a lecture, PDF, or notes to generate vignettes.
            </div>
          ) : (
            <select
              value={selectedMaterial || ""}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-200"
            >
              <option value="">Choose a material...</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.file_type})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Number of Vignettes to Generate
          </label>
          <input
            type="number"
            min="5"
            max="100"
            step="5"
            value={vignetteCount}
            onChange={(e) => setVignetteCount(parseInt(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-200"
          />
          <div className="mt-2 text-xs text-zinc-500">
            Recommended: 20 vignettes per material (~2 minutes generation time)
          </div>
        </div>

        <button
          onClick={generateVignettes}
          disabled={!selectedMaterial || generating}
          className={`w-full rounded-lg px-6 py-3 font-medium transition-colors ${
            !selectedMaterial || generating
              ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {generating ? "Generating..." : `Generate ${vignetteCount} Vignettes`}
        </button>
      </div>

      {/* Progress/Status */}
      {progress && (
        <div className="mb-6 rounded-lg border border-emerald-700 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
          {progress}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-rose-700 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Generated Vignettes Preview */}
      {generatedVignettes.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-lg font-semibold mb-4">
            Generated Vignettes ({generatedVignettes.length})
          </h3>
          <div className="space-y-3">
            {generatedVignettes.slice(0, 5).map((v, idx) => (
              <div key={v.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-sm font-medium text-zinc-300">
                    Vignette #{idx + 1}
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {v.system}
                    </span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {v.difficulty}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-zinc-400 line-clamp-2">
                  {v.prompt.slice(0, 200)}...
                </div>
              </div>
            ))}
            {generatedVignettes.length > 5 && (
              <div className="text-center text-sm text-zinc-500">
                +{generatedVignettes.length - 5} more vignettes generated
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
        <h4 className="text-sm font-semibold text-zinc-300 mb-2">How it works:</h4>
        <ol className="space-y-2 text-sm text-zinc-400">
          <li>1. Upload study materials (lectures, PDFs, notes) in the Materials tab</li>
          <li>2. Select a material and choose how many vignettes to generate</li>
          <li>3. AI analyzes the content and creates USMLE-style clinical vignettes</li>
          <li>4. Generated vignettes appear in your Vignette Bank for practice</li>
          <li>5. Each vignette includes detailed explanations and comparison tables</li>
        </ol>
      </div>
    </div>
  );
}
