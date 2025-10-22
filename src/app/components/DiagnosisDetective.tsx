"use client";

interface DiagnosisDetectiveProps {
  onExit: () => void;
}

export default function DiagnosisDetective({ onExit }: DiagnosisDetectiveProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">🕵️ Diagnosis Detective</h2>
          <p className="mt-2 text-sm text-zinc-400">Solve mystery cases strategically</p>
        </div>
        <button
          onClick={onExit}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
        >
          ← Back
        </button>
      </div>

      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12">
        <div className="text-center">
          <div className="mb-4 text-6xl">🕵️</div>
          <h3 className="mb-2 text-xl font-semibold text-zinc-300">Building Diagnosis Detective...</h3>
          <p className="text-sm text-zinc-500">This tool will be fully implemented in Phase 3</p>
        </div>
      </div>
    </div>
  );
}
