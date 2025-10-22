"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type DxRCaseData = {
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
};

type FullCaseData = {
  history_items: any[];
  physical_exam: any;
  available_lab_tests: any[];
  lab_results: any[];
  available_imaging: any[];
  imaging_results: any[];
  differential_diagnoses: string[];
  correct_diagnosis: string;
  diagnosis_explanation: string;
  treatment_plan: any;
};

export default function DxRSimulation({
  caseData,
  onExit,
}: {
  caseData: DxRCaseData;
  onExit: () => void;
}) {
  const [fullCase, setFullCase] = useState<FullCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "physical" | "labs" | "imaging" | "diagnosis">("history");
  const [revealedHistory, setRevealedHistory] = useState<Set<number>>(new Set());
  const [revealedExam, setRevealedExam] = useState<Set<string>>(new Set());
  const [orderedLabs, setOrderedLabs] = useState<Set<string>>(new Set());
  const [orderedImaging, setOrderedImaging] = useState<Set<string>>(new Set());
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    fetchFullCase();
  }, []);

  async function fetchFullCase() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dxr_cases")
      .select("*")
      .eq("id", caseData.id)
      .single();

    if (error) {
      console.error("Error fetching full case:", error);
    } else {
      setFullCase(data);
    }
    setLoading(false);
  }

  function revealHistoryItem(index: number) {
    setRevealedHistory(new Set([...revealedHistory, index]));
  }

  function revealExamSection(section: string) {
    setRevealedExam(new Set([...revealedExam, section]));
  }

  function orderLab(testName: string) {
    setOrderedLabs(new Set([...orderedLabs, testName]));
  }

  function orderImaging(imagingName: string) {
    setOrderedImaging(new Set([...orderedImaging, imagingName]));
  }

  function submitDiagnosis() {
    if (!selectedDiagnosis || !fullCase) return;

    const correct = selectedDiagnosis.toLowerCase() === fullCase.correct_diagnosis.toLowerCase();

    // Calculate score
    let finalScore = 0;
    if (correct) finalScore += 40; // 40 points for correct diagnosis

    // Efficiency bonus (fewer tests = higher score)
    const testsOrdered = orderedLabs.size + orderedImaging.size;
    if (testsOrdered <= 3) finalScore += 30;
    else if (testsOrdered <= 5) finalScore += 20;
    else if (testsOrdered <= 8) finalScore += 10;

    // History gathering (revealed items)
    const historyPercent = (revealedHistory.size / (fullCase.history_items?.length || 1)) * 100;
    if (historyPercent >= 50) finalScore += 15;
    else if (historyPercent >= 30) finalScore += 10;
    else if (historyPercent >= 10) finalScore += 5;

    // Physical exam thoroughness
    const examPercent = (revealedExam.size / Object.keys(fullCase.physical_exam || {}).length) * 100;
    if (examPercent >= 50) finalScore += 15;
    else if (examPercent >= 30) finalScore += 10;
    else if (examPercent >= 10) finalScore += 5;

    setScore(finalScore);
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-400">Loading case...</div>
      </div>
    );
  }

  if (!fullCase) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-zinc-400">Failed to load case</div>
      </div>
    );
  }

  if (submitted) {
    const correct = selectedDiagnosis.toLowerCase() === fullCase.correct_diagnosis.toLowerCase();

    return (
      <div className="flex h-full flex-col gap-4 overflow-auto p-4">
        {/* Header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-100">Case Complete</h2>
            <button
              onClick={onExit}
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
            >
              Back to Cases
            </button>
          </div>
        </div>

        {/* Score */}
        <div className={`rounded-2xl border p-6 text-center ${
          correct
            ? "border-green-700 bg-green-900/20"
            : "border-rose-700 bg-rose-900/20"
        }`}>
          <div className={`mb-2 text-4xl font-bold ${correct ? "text-green-300" : "text-rose-300"}`}>
            {score}/100
          </div>
          <div className={`text-lg ${correct ? "text-green-400" : "text-rose-400"}`}>
            {correct ? "✅ Correct Diagnosis!" : "❌ Incorrect Diagnosis"}
          </div>
        </div>

        {/* Diagnosis Feedback */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-3 text-lg font-semibold text-zinc-200">Diagnosis</h3>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-zinc-400">Your diagnosis:</span>{" "}
              <span className={correct ? "text-green-300" : "text-rose-300"}>
                {selectedDiagnosis}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-zinc-400">Correct diagnosis:</span>{" "}
              <span className="text-zinc-200">{fullCase.correct_diagnosis}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-800 pt-4">
            <div className="text-sm font-medium text-zinc-300">Explanation:</div>
            <div className="mt-2 text-sm text-zinc-400">{fullCase.diagnosis_explanation}</div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-3 text-lg font-semibold text-zinc-200">Performance Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Correct Diagnosis</span>
              <span className="text-zinc-200">{correct ? "40/40" : "0/40"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Test Efficiency ({orderedLabs.size + orderedImaging.size} tests)</span>
              <span className="text-zinc-200">
                {orderedLabs.size + orderedImaging.size <= 3 ? "30/30" :
                 orderedLabs.size + orderedImaging.size <= 5 ? "20/30" :
                 orderedLabs.size + orderedImaging.size <= 8 ? "10/30" : "0/30"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">History Taking ({revealedHistory.size} items)</span>
              <span className="text-zinc-200">
                {revealedHistory.size >= (fullCase.history_items?.length || 1) * 0.5 ? "15/15" :
                 revealedHistory.size >= (fullCase.history_items?.length || 1) * 0.3 ? "10/15" :
                 revealedHistory.size >= (fullCase.history_items?.length || 1) * 0.1 ? "5/15" : "0/15"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Physical Exam ({revealedExam.size} sections)</span>
              <span className="text-zinc-200">
                {revealedExam.size >= Object.keys(fullCase.physical_exam || {}).length * 0.5 ? "15/15" :
                 revealedExam.size >= Object.keys(fullCase.physical_exam || {}).length * 0.3 ? "10/15" :
                 revealedExam.size >= Object.keys(fullCase.physical_exam || {}).length * 0.1 ? "5/15" : "0/15"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{caseData.title}</h2>
            <div className="text-sm text-zinc-400">
              {caseData.patient_age}yo {caseData.patient_sex} • CC: {caseData.chief_complaint}
            </div>
          </div>
          <button
            onClick={onExit}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
          >
            Exit Case
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex gap-2">
          {["history", "physical", "labs", "imaging", "diagnosis"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="text-sm text-zinc-400">
              Click on questions to reveal the patient's answers
            </div>
            {fullCase.history_items?.map((item: any, index: number) => (
              <div
                key={index}
                className={`rounded-xl border p-4 transition-colors ${
                  revealedHistory.has(index)
                    ? "border-blue-700 bg-blue-900/20"
                    : "cursor-pointer border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
                onClick={() => !revealedHistory.has(index) && revealHistoryItem(index)}
              >
                <div className="text-sm font-medium text-zinc-200">{item.question}</div>
                {revealedHistory.has(index) && (
                  <div className="mt-2 text-sm text-zinc-400">{item.answer}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "physical" && (
          <div className="space-y-3">
            <div className="text-sm text-zinc-400">
              Click on exam sections to reveal findings
            </div>
            {fullCase.physical_exam && Object.entries(fullCase.physical_exam).map(([section, findings]: [string, any]) => (
              <div
                key={section}
                className={`rounded-xl border p-4 transition-colors ${
                  revealedExam.has(section)
                    ? "border-blue-700 bg-blue-900/20"
                    : "cursor-pointer border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                }`}
                onClick={() => !revealedExam.has(section) && revealExamSection(section)}
              >
                <div className="text-sm font-medium text-zinc-200">
                  {section.replace(/_/g, " ").toUpperCase()}
                </div>
                {revealedExam.has(section) && (
                  <div className="mt-2 text-sm text-zinc-400">{findings}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "labs" && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">Available Lab Tests</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {fullCase.available_lab_tests?.map((test: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => orderLab(test.test_name)}
                    disabled={orderedLabs.has(test.test_name)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      orderedLabs.has(test.test_name)
                        ? "border-green-700 bg-green-900/20 text-green-300"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {test.test_name}
                    {orderedLabs.has(test.test_name) && " ✓"}
                  </button>
                ))}
              </div>
            </div>

            {orderedLabs.size > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-200">Lab Results</h3>
                <div className="space-y-2">
                  {fullCase.lab_results
                    ?.filter((result: any) => orderedLabs.has(result.test_name))
                    .map((result: any, index: number) => (
                      <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                        <div className="text-sm font-medium text-zinc-200">{result.test_name}</div>
                        <div className="mt-1 text-sm text-zinc-400">{result.result}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "imaging" && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">Available Imaging</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {fullCase.available_imaging?.map((imaging: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => orderImaging(imaging.study_name)}
                    disabled={orderedImaging.has(imaging.study_name)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      orderedImaging.has(imaging.study_name)
                        ? "border-green-700 bg-green-900/20 text-green-300"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {imaging.study_name}
                    {orderedImaging.has(imaging.study_name) && " ✓"}
                  </button>
                ))}
              </div>
            </div>

            {orderedImaging.size > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-zinc-200">Imaging Results</h3>
                <div className="space-y-2">
                  {fullCase.imaging_results
                    ?.filter((result: any) => orderedImaging.has(result.study_name))
                    .map((result: any, index: number) => (
                      <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                        <div className="text-sm font-medium text-zinc-200">{result.study_name}</div>
                        <div className="mt-1 text-sm text-zinc-400">{result.findings}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "diagnosis" && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">Select Your Diagnosis</h3>
              <div className="space-y-2">
                {fullCase.differential_diagnoses?.map((diagnosis: string, index: number) => (
                  <label
                    key={index}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedDiagnosis === diagnosis
                        ? "border-blue-700 bg-blue-900/20"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="diagnosis"
                      value={diagnosis}
                      checked={selectedDiagnosis === diagnosis}
                      onChange={(e) => setSelectedDiagnosis(e.target.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-zinc-200">{diagnosis}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={submitDiagnosis}
              disabled={!selectedDiagnosis}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
            >
              Submit Diagnosis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
