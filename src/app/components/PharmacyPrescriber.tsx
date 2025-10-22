"use client";

interface PharmacyPrescriberProps {
  onExit: () => void;
}

export default function PharmacyPrescriber({ onExit }: PharmacyPrescriberProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">💊 Pharmacology Prescriber</h2>
          <p className="mt-2 text-sm text-zinc-400">Write realistic prescriptions with safety checks</p>
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
          <div className="mb-4 text-6xl">💊</div>
          <h3 className="mb-2 text-xl font-semibold text-zinc-300">Building Pharmacy Prescriber...</h3>
          <p className="text-sm text-zinc-500">This tool will be fully implemented in Phase 5</p>
        </div>
      </div>
    </div>
  );
}
