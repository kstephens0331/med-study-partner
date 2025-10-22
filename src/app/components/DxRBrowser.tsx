"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import DxRSimulation from "./DxRSimulation";

type DxRCase = {
  id: string;
  case_number: number;
  difficulty: string;
  title: string;
  chief_complaint: string;
  patient_age: number;
  patient_sex: string;
  setting: string;
  system: string;
  correct_diagnosis: string;
  learning_objectives: string[];
  created_at: string;
};

export default function DxRBrowser() {
  const [cases, setCases] = useState<DxRCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<DxRCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterSystem, setFilterSystem] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dxr_cases")
      .select("id, case_number, difficulty, title, chief_complaint, patient_age, patient_sex, setting, system, correct_diagnosis, learning_objectives, created_at")
      .order("case_number", { ascending: true });

    if (error) {
      console.error("Error fetching DxR cases:", error);
    } else {
      setCases(data || []);
    }
    setLoading(false);
  }

  const filteredCases = cases.filter((c) => {
    const matchesDifficulty = filterDifficulty === "all" || c.difficulty === filterDifficulty;
    const matchesSystem = filterSystem === "all" || c.system === filterSystem;
    const matchesSearch =
      searchTerm === "" ||
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.correct_diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDifficulty && matchesSystem && matchesSearch;
  });

  const difficulties = ["beginner", "intermediate", "advanced", "expert"];
  const systems = Array.from(new Set(cases.map((c) => c.system).filter(Boolean))).sort();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-900/40 text-green-300 border-green-700";
      case "intermediate":
        return "bg-blue-900/40 text-blue-300 border-blue-700";
      case "advanced":
        return "bg-orange-900/40 text-orange-300 border-orange-700";
      case "expert":
        return "bg-rose-900/40 text-rose-300 border-rose-700";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  if (selectedCase) {
    return <DxRSimulation caseData={selectedCase} onExit={() => setSelectedCase(null)} />;
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h1 className="mb-2 text-2xl font-bold text-zinc-100">Virtual Patient Cases (DxR)</h1>
        <p className="text-sm text-zinc-400">
          Interactive clinical simulations to practice diagnostic reasoning
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Search */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Search</label>
            <input
              type="text"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
            />
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Difficulty</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">All Levels</option>
              {difficulties.map((diff) => (
                <option key={diff} value={diff}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* System Filter */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">System</label>
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">All Systems</option>
              {systems.map((sys) => (
                <option key={sys} value={sys}>
                  {sys}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-xs text-zinc-500">
          Showing {filteredCases.length} of {cases.length} cases
        </div>
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-zinc-400">Loading cases...</div>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="mb-2 text-xl text-zinc-300">No cases found</div>
            <div className="text-sm text-zinc-500">Try adjusting your filters</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 overflow-auto md:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((caseData) => (
            <div
              key={caseData.id}
              className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
              onClick={() => setSelectedCase(caseData)}
            >
              {/* Case Number */}
              <div className="mb-2 text-xs text-zinc-500">Case #{caseData.case_number}</div>

              {/* Title */}
              <h3 className="mb-2 text-sm font-medium text-zinc-200">{caseData.title}</h3>

              {/* Patient Info */}
              <div className="mb-3 text-xs text-zinc-400">
                {caseData.patient_age}yo {caseData.patient_sex} • {caseData.setting}
              </div>

              {/* Chief Complaint */}
              <div className="mb-3 text-sm text-zinc-300">
                <span className="font-medium">CC:</span> {caseData.chief_complaint}
              </div>

              {/* Badges */}
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={`rounded border px-2 py-1 text-xs ${getDifficultyColor(caseData.difficulty)}`}>
                  {caseData.difficulty}
                </span>
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                  {caseData.system}
                </span>
              </div>

              {/* Learning Objectives */}
              {caseData.learning_objectives && caseData.learning_objectives.length > 0 && (
                <div className="border-t border-zinc-800 pt-2">
                  <div className="text-xs text-zinc-500">Learning Objectives:</div>
                  <ul className="mt-1 space-y-1">
                    {caseData.learning_objectives.slice(0, 2).map((obj, i) => (
                      <li key={i} className="text-xs text-zinc-400">
                        • {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Start Button */}
              <button className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors group-hover:bg-blue-500">
                Start Case
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
