"use client";

import { useState, useEffect } from "react";
import { DxRCase, DxRCaseAttempt, HistoryItem, PhysicalExamFinding } from "@/types/dxr";
import { createBrowserClient } from "@/lib/supabaseBrowser";

interface DxRCaseViewProps {
  caseData: DxRCase;
  onExit: () => void;
}

type TabView = "history" | "exam" | "diagnostics" | "differential" | "soap" | "submit";

export default function DxRCaseView({ caseData, onExit }: DxRCaseViewProps) {
  const [currentTab, setCurrentTab] = useState<TabView>("history");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeStarted, setTimeStarted] = useState<Date>(new Date());

  // Student's selections
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<PhysicalExamFinding[]>([]);
  const [orderedLabs, setOrderedLabs] = useState<any[]>([]);
  const [orderedImaging, setOrderedImaging] = useState<any[]>([]);
  const [orderedProcedures, setOrderedProcedures] = useState<any[]>([]);
  const [differential, setDifferential] = useState<any[]>([]);
  const [soapSubjective, setSoapSubjective] = useState("");
  const [soapObjective, setSoapObjective] = useState("");
  const [soapAssessment, setSoapAssessment] = useState("");
  const [soapPlan, setSoapPlan] = useState("");

  const supabase = createBrowserClient();

  useEffect(() => {
    initializeAttempt();
  }, []);

  async function initializeAttempt() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // Count existing attempts for this case
    const { count } = await supabase
      .from("dxr_case_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("case_id", caseData.id);

    const attemptNumber = (count || 0) + 1;

    // Create new attempt
    const { data, error } = await supabase
      .from("dxr_case_attempts")
      .insert({
        user_id: user.id,
        case_id: caseData.id,
        attempt_number: attemptNumber,
        started_at: new Date().toISOString(),
        is_complete: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating attempt:", error);
      return;
    }

    setAttemptId(data.id);
  }

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!attemptId) return;

    const interval = setInterval(() => {
      saveProgress(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [attemptId, selectedHistory, selectedExam, orderedLabs, orderedImaging, orderedProcedures, differential, soapSubjective, soapObjective, soapAssessment, soapPlan]);

  async function saveProgress(isComplete: boolean = false) {
    if (!attemptId) return;

    const timeSpent = Math.floor((new Date().getTime() - timeStarted.getTime()) / 1000);

    const { error } = await supabase
      .from("dxr_case_attempts")
      .update({
        history_taken: selectedHistory,
        exam_performed: selectedExam,
        labs_ordered: orderedLabs,
        imaging_ordered: orderedImaging,
        procedures_ordered: orderedProcedures,
        differential_diagnosis: differential,
        soap_subjective: soapSubjective,
        soap_objective: soapObjective,
        soap_assessment: soapAssessment,
        soap_plan: soapPlan,
        time_spent_seconds: timeSpent,
        is_complete: isComplete,
        submitted_at: isComplete ? new Date().toISOString() : null,
      })
      .eq("id", attemptId);

    if (error) {
      console.error("Error saving progress:", error);
    }
  }

  const tabs: { id: TabView; label: string; icon: string }[] = [
    { id: "history", label: "History", icon: "📋" },
    { id: "exam", label: "Physical Exam", icon: "🩺" },
    { id: "diagnostics", label: "Diagnostics", icon: "🔬" },
    { id: "differential", label: "Differential Dx", icon: "🧠" },
    { id: "soap", label: "SOAP Note", icon: "📝" },
    { id: "submit", label: "Submit", icon: "✅" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onExit}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to Cases
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
            <p className="text-gray-600">Case #{caseData.case_number}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Difficulty</div>
            <div className="text-lg font-semibold capitalize">{caseData.difficulty}</div>
          </div>
        </div>
      </div>

      {/* Chief Complaint Card */}
      <div className="p-4 bg-blue-50 border-b border-blue-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Chief Complaint</h2>
          <p className="text-lg text-blue-800">{caseData.chief_complaint}</p>
          <div className="mt-2 text-sm text-blue-700">
            <span className="font-medium">Patient:</span> {caseData.patient_name || "Anonymous"},{" "}
            {caseData.patient_age}yo {caseData.patient_sex === "M" ? "Male" : caseData.patient_sex === "F" ? "Female" : "Other"}
            {" • "}
            <span className="font-medium">Setting:</span> {caseData.setting}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition ${
                currentTab === tab.id
                  ? "bg-blue-600 text-white border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {currentTab === "history" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">History Taking</h2>
            <p className="text-gray-600 mb-6">
              Select the questions you want to ask the patient. The patient's responses will appear below each question.
            </p>
            {/* History interface will go here in Phase 3 */}
            <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">History taking interface - Coming in Phase 3</p>
              <p className="text-sm text-gray-400 mt-2">{caseData.history_items?.length || 0} questions available</p>
            </div>
          </div>
        )}

        {currentTab === "exam" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Physical Examination</h2>
            <p className="text-gray-600 mb-6">
              Select which examination components you want to perform. Findings will be revealed as you select them.
            </p>
            {/* Exam interface will go here in Phase 4 */}
            <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">Physical exam interface - Coming in Phase 4</p>
              <p className="text-sm text-gray-400 mt-2">{caseData.physical_exam_findings?.length || 0} exam components available</p>
            </div>
          </div>
        )}

        {currentTab === "diagnostics" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Diagnostic Workup</h2>
            <p className="text-gray-600 mb-6">
              Order laboratory tests, imaging studies, and procedures. Results will be displayed as they become available.
            </p>
            {/* Diagnostics interface will go here in Phase 5 */}
            <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">Diagnostic workup interface - Coming in Phase 5</p>
              <p className="text-sm text-gray-400 mt-2">
                {caseData.available_labs?.length || 0} labs • {caseData.available_imaging?.length || 0} imaging • {caseData.available_procedures?.length || 0} procedures
              </p>
            </div>
          </div>
        )}

        {currentTab === "differential" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Differential Diagnosis</h2>
            <p className="text-gray-600 mb-6">
              Build your differential diagnosis by ranking the most likely diagnoses with supporting evidence.
            </p>
            {/* Differential interface will go here in Phase 6 */}
            <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">Differential diagnosis builder - Coming in Phase 6</p>
            </div>
          </div>
        )}

        {currentTab === "soap" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">SOAP Note</h2>
            <p className="text-gray-600 mb-6">
              Document your clinical encounter using the SOAP format (Subjective, Objective, Assessment, Plan).
            </p>
            {/* SOAP interface will go here in Phase 7 */}
            <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">SOAP note editor - Coming in Phase 7</p>
            </div>
          </div>
        )}

        {currentTab === "submit" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Submit for Evaluation</h2>
            <p className="text-gray-600 mb-6">
              Review your work and submit for AI evaluation and feedback.
            </p>
            {/* Submit interface will go here in Phase 8 */}
            <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">Submission and evaluation - Coming in Phase 8</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Progress Save Indicator */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="text-sm text-gray-600">
            Auto-saving progress every 30 seconds...
          </div>
          <button
            onClick={() => saveProgress(false)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Save Now
          </button>
        </div>
      </div>
    </div>
  );
}
