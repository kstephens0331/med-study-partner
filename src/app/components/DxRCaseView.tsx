"use client";

import { useState, useEffect } from "react";
import { DxRCase, DxRCaseAttempt, HistoryItem, PhysicalExamFinding } from "@/types/dxr";
import { createClient } from "@/lib/supabaseClient";

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

  const supabase = createClient();

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
          </div>
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
          <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">History Taking</h2>
            <p className="text-gray-600 mb-6">
              Select questions to ask the patient. Patient responses will appear below. Questions are organized by category.
            </p>

            {/* Question Categories */}
            <div className="space-y-6">
              {['HPI', 'PMH', 'FH', 'SH', 'ROS'].map((category) => {
                const categoryQuestions = caseData.history_items?.filter(
                  (item) => item.category === category
                ) || [];

                if (categoryQuestions.length === 0) return null;

                const selectedInCategory = selectedHistory.filter(
                  (item) => item.category === category
                );

                return (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        {category === 'HPI' && '📋 History of Present Illness'}
                        {category === 'PMH' && '🏥 Past Medical History'}
                        {category === 'FH' && '👨‍👩‍👧‍👦 Family History'}
                        {category === 'SH' && '🏠 Social History'}
                        {category === 'ROS' && '🔍 Review of Systems'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedInCategory.length} of {categoryQuestions.length} questions asked
                      </p>
                    </div>

                    {/* Question Selector */}
                    <div className="p-4 bg-white">
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value=""
                        onChange={(e) => {
                          const question = categoryQuestions.find(
                            (q) => q.question === e.target.value
                          );
                          if (question && !selectedHistory.find((h) => h.question === question.question)) {
                            setSelectedHistory([...selectedHistory, question]);
                          }
                        }}
                      >
                        <option value="">-- Select a question to ask --</option>
                        {categoryQuestions.map((item, idx) => (
                          <option
                            key={idx}
                            value={item.question}
                            disabled={selectedHistory.some((h) => h.question === item.question)}
                          >
                            {selectedHistory.some((h) => h.question === item.question)
                              ? `✓ ${item.question}`
                              : item.question}
                          </option>
                        ))}
                      </select>

                      {/* Selected Questions & Responses */}
                      {selectedInCategory.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {selectedInCategory.map((item, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg border-l-4 ${
                                item.isKeyFinding
                                  ? 'bg-yellow-50 border-yellow-500'
                                  : 'bg-gray-50 border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-medium text-gray-900 flex-1">
                                  Q: {item.question}
                                </p>
                                <button
                                  onClick={() => {
                                    setSelectedHistory(
                                      selectedHistory.filter((h) => h.question !== item.question)
                                    );
                                  }}
                                  className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                  title="Remove question"
                                >
                                  ✕
                                </button>
                              </div>
                              <p className="text-gray-700 mt-2 pl-4 border-l-2 border-gray-300">
                                <span className="font-medium text-blue-700">Patient:</span> {item.response}
                              </p>
                              {item.isKeyFinding && (
                                <div className="mt-2 text-xs text-yellow-700 font-medium">
                                  ⭐ Key finding
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    Total Questions Asked: {selectedHistory.length} / {caseData.history_items?.length || 0}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Key findings identified: {selectedHistory.filter((h) => h.isKeyFinding).length}
                  </p>
                </div>
                {selectedHistory.length > 0 && (
                  <button
                    onClick={() => setSelectedHistory([])}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {currentTab === "exam" && (
          <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Physical Examination</h2>
            <p className="text-gray-600 mb-6">
              Select exam components to perform. Findings will be revealed as you check each item.
            </p>

            {/* Exam Systems */}
            <div className="space-y-4">
              {['General', 'Vital Signs', 'HEENT', 'Neck', 'Cardiovascular', 'Pulmonary', 'Abdomen', 'Musculoskeletal', 'Neurological', 'Skin', 'Extremities'].map((system) => {
                const systemFindings = caseData.physical_exam_findings?.filter(
                  (finding) => finding.system === system
                ) || [];

                if (systemFindings.length === 0) return null;

                const selectedInSystem = selectedExam.filter(
                  (finding) => finding.system === system
                );

                return (
                  <div key={system} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* System Header */}
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {system === 'General' && '👤 General Appearance'}
                          {system === 'Vital Signs' && '❤️ Vital Signs'}
                          {system === 'HEENT' && '👁️ HEENT'}
                          {system === 'Neck' && '🦒 Neck'}
                          {system === 'Cardiovascular' && '❤️ Cardiovascular'}
                          {system === 'Pulmonary' && '🫁 Pulmonary'}
                          {system === 'Abdomen' && '🫃 Abdomen'}
                          {system === 'Musculoskeletal' && '🦴 Musculoskeletal'}
                          {system === 'Neurological' && '🧠 Neurological'}
                          {system === 'Skin' && '🩹 Skin'}
                          {system === 'Extremities' && '🦵 Extremities'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedInSystem.length} of {systemFindings.length} components examined
                        </p>
                      </div>
                      {systemFindings.length > 0 && (
                        <button
                          onClick={() => {
                            const allSelected = systemFindings.every((f) =>
                              selectedExam.some((e) => e.finding === f.finding)
                            );
                            if (allSelected) {
                              // Deselect all in this system
                              setSelectedExam(
                                selectedExam.filter((e) => e.system !== system)
                              );
                            } else {
                              // Select all in this system
                              const newFindings = systemFindings.filter(
                                (f) => !selectedExam.some((e) => e.finding === f.finding)
                              );
                              setSelectedExam([...selectedExam, ...newFindings]);
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {systemFindings.every((f) =>
                            selectedExam.some((e) => e.finding === f.finding)
                          )
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                      )}
                    </div>

                    {/* Exam Checkboxes */}
                    <div className="p-4 bg-white">
                      <div className="space-y-2">
                        {systemFindings.map((finding, idx) => {
                          const isSelected = selectedExam.some(
                            (e) => e.finding === finding.finding
                          );

                          return (
                            <div key={idx}>
                              <label className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedExam([...selectedExam, finding]);
                                    } else {
                                      setSelectedExam(
                                        selectedExam.filter((f) => f.finding !== finding.finding)
                                      );
                                    }
                                  }}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <span className="text-gray-900 font-medium">
                                    Examine {system}
                                  </span>
                                  {isSelected && (
                                    <div
                                      className={`mt-2 p-3 rounded-lg border-l-4 ${
                                        finding.isAbnormal
                                          ? 'bg-red-50 border-red-500'
                                          : 'bg-green-50 border-green-500'
                                      }`}
                                    >
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">Finding:</span> {finding.finding}
                                      </p>
                                      {finding.isAbnormal && (
                                        <div className="mt-1 text-xs text-red-700 font-medium">
                                          ⚠️ Abnormal finding
                                        </div>
                                      )}
                                      {finding.isKeyFinding && (
                                        <div className="mt-1 text-xs text-yellow-700 font-medium">
                                          ⭐ Key finding
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    Total Exam Components: {selectedExam.length} / {caseData.physical_exam_findings?.length || 0}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Abnormal findings: {selectedExam.filter((e) => e.isAbnormal).length} •
                    Key findings: {selectedExam.filter((e) => e.isKeyFinding).length}
                  </p>
                </div>
                {selectedExam.length > 0 && (
                  <button
                    onClick={() => setSelectedExam([])}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                  >
                    Clear All
                  </button>
                )}
              </div>
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
