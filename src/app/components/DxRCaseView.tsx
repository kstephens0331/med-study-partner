"use client";

import { useState, useEffect } from "react";
import { DxRCase, DxRCaseAttempt, HistoryItem, PhysicalExamFinding } from "@/types/dxr";
import { createClient } from "@/lib/supabaseClient";

interface DxRCaseViewProps {
  caseData: DxRCase;
  onExit: () => void;
}

type TabView = "history" | "exam" | "diagnostics" | "differential" | "soap" | "submit";
type DiagnosticTabView = "labs" | "imaging" | "procedures";

export default function DxRCaseView({ caseData, onExit }: DxRCaseViewProps) {
  const [currentTab, setCurrentTab] = useState<TabView>("history");
  const [diagnosticTab, setDiagnosticTab] = useState<DiagnosticTabView>("labs");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeStarted, setTimeStarted] = useState<Date>(new Date());

  // Student's selections
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<PhysicalExamFinding[]>([]);
  const [orderedLabs, setOrderedLabs] = useState<any[]>([]);
  const [orderedImaging, setOrderedImaging] = useState<any[]>([]);
  const [orderedProcedures, setOrderedProcedures] = useState<any[]>([]);
  const [differential, setDifferential] = useState<any[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState<any>({
    diagnosis: '',
    rank: 0,
    likelihood: 'Medium',
    justification: '',
    supporting_findings: [],
    contradicting_findings: [],
  });
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
          <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Diagnostic Workup</h2>
            <p className="text-gray-600 mb-6">
              Order laboratory tests, imaging studies, and procedures. Results will be displayed immediately.
            </p>

            {/* Diagnostic Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setDiagnosticTab('labs')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    diagnosticTab === 'labs'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔬 Laboratory Tests ({caseData.available_labs?.length || 0})
                </button>
                <button
                  onClick={() => setDiagnosticTab('imaging')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    diagnosticTab === 'imaging'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📸 Imaging Studies ({caseData.available_imaging?.length || 0})
                </button>
                <button
                  onClick={() => setDiagnosticTab('procedures')}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    diagnosticTab === 'procedures'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💉 Procedures ({caseData.available_procedures?.length || 0})
                </button>
              </div>
            </div>

            {/* Laboratory Tests */}
            {diagnosticTab === 'labs' && (
              <div className="space-y-4">
                {caseData.available_labs && caseData.available_labs.length > 0 ? (
                  caseData.available_labs.map((lab, idx) => {
                    const isOrdered = orderedLabs.some((l) => l.name === lab.name);
                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{lab.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Category: {lab.category} • Cost: ${lab.cost} • Turnaround: {lab.turnaround_time}
                              </p>
                              {lab.clinical_indication && (
                                <p className="text-sm text-gray-500 mt-1 italic">
                                  {lab.clinical_indication}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isOrdered) {
                                  setOrderedLabs(orderedLabs.filter((l) => l.name !== lab.name));
                                } else {
                                  setOrderedLabs([...orderedLabs, lab]);
                                }
                              }}
                              className={`ml-4 px-4 py-2 text-sm font-medium rounded-lg transition ${
                                isOrdered
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isOrdered ? 'Cancel' : 'Order'}
                            </button>
                          </div>

                          {/* Results */}
                          {isOrdered && lab.results && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h5 className="font-medium text-gray-900 mb-2">Results:</h5>
                              <div className="space-y-1">
                                {lab.results.map((result, ridx) => (
                                  <div
                                    key={ridx}
                                    className={`text-sm flex items-center justify-between ${
                                      result.isAbnormal ? 'text-red-700 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    <span>{result.test}:</span>
                                    <span>
                                      {result.value} {result.unit} {result.isAbnormal && '⚠️'}
                                      <span className="text-gray-500 ml-2 text-xs">
                                        (Ref: {result.referenceRange})
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-8">No laboratory tests available for this case.</p>
                )}
              </div>
            )}

            {/* Imaging Studies */}
            {diagnosticTab === 'imaging' && (
              <div className="space-y-4">
                {caseData.available_imaging && caseData.available_imaging.length > 0 ? (
                  caseData.available_imaging.map((imaging, idx) => {
                    const isOrdered = orderedImaging.some((i) => i.name === imaging.name);
                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{imaging.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {imaging.modality} • {imaging.body_part} • Cost: ${imaging.cost} • {imaging.turnaround_time}
                              </p>
                              {imaging.radiation && (
                                <p className="text-xs text-orange-600 mt-1">
                                  ☢️ Radiation: {imaging.radiation_dose || 'Yes'}
                                </p>
                              )}
                              {imaging.clinical_indication && (
                                <p className="text-sm text-gray-500 mt-1 italic">
                                  {imaging.clinical_indication}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isOrdered) {
                                  setOrderedImaging(orderedImaging.filter((i) => i.name !== imaging.name));
                                } else {
                                  setOrderedImaging([...orderedImaging, imaging]);
                                }
                              }}
                              className={`ml-4 px-4 py-2 text-sm font-medium rounded-lg transition ${
                                isOrdered
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isOrdered ? 'Cancel' : 'Order'}
                            </button>
                          </div>

                          {/* Results */}
                          {isOrdered && imaging.findings && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h5 className="font-medium text-gray-900 mb-2">Findings:</h5>
                              <p className="text-sm text-gray-700 mb-2">{imaging.findings}</p>
                              {imaging.impression && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="font-medium text-sm text-gray-900">Impression:</p>
                                  <p className="text-sm text-gray-700">{imaging.impression}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-8">No imaging studies available for this case.</p>
                )}
              </div>
            )}

            {/* Procedures */}
            {diagnosticTab === 'procedures' && (
              <div className="space-y-4">
                {caseData.available_procedures && caseData.available_procedures.length > 0 ? (
                  caseData.available_procedures.map((procedure, idx) => {
                    const isOrdered = orderedProcedures.some((p) => p.name === procedure.name);
                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{procedure.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {procedure.category} • Cost: ${procedure.cost} • {procedure.turnaround_time}
                              </p>
                              {procedure.risks && (
                                <p className="text-xs text-red-600 mt-1">
                                  ⚠️ Risks: {procedure.risks}
                                </p>
                              )}
                              {procedure.contraindications && (
                                <p className="text-xs text-orange-600 mt-1">
                                  🚫 Contraindications: {procedure.contraindications}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isOrdered) {
                                  setOrderedProcedures(orderedProcedures.filter((p) => p.name !== procedure.name));
                                } else {
                                  setOrderedProcedures([...orderedProcedures, procedure]);
                                }
                              }}
                              className={`ml-4 px-4 py-2 text-sm font-medium rounded-lg transition ${
                                isOrdered
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isOrdered ? 'Cancel' : 'Order'}
                            </button>
                          </div>

                          {/* Results */}
                          {isOrdered && procedure.findings && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h5 className="font-medium text-gray-900 mb-2">Findings:</h5>
                              <p className="text-sm text-gray-700">{procedure.findings}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-8">No procedures available for this case.</p>
                )}
              </div>
            )}

            {/* Summary Stats */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">
                    Total Ordered: {orderedLabs.length + orderedImaging.length + orderedProcedures.length}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Labs: {orderedLabs.length} • Imaging: {orderedImaging.length} • Procedures: {orderedProcedures.length}
                  </p>
                </div>
                {(orderedLabs.length > 0 || orderedImaging.length > 0 || orderedProcedures.length > 0) && (
                  <button
                    onClick={() => {
                      setOrderedLabs([]);
                      setOrderedImaging([]);
                      setOrderedProcedures([]);
                    }}
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {currentTab === "differential" && (
          <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Differential Diagnosis</h2>
            <p className="text-gray-600 mb-6">
              Build and rank your differential diagnosis. Add diagnoses with supporting and contradicting evidence.
            </p>

            {/* Add New Diagnosis */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Add Diagnosis</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Acute Myocardial Infarction"
                    value={newDiagnosis.diagnosis}
                    onChange={(e) =>
                      setNewDiagnosis({ ...newDiagnosis, diagnosis: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Likelihood
                  </label>
                  <select
                    value={newDiagnosis.likelihood}
                    onChange={(e) =>
                      setNewDiagnosis({ ...newDiagnosis, likelihood: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Justification *
                  </label>
                  <textarea
                    placeholder="Explain why this diagnosis is on your differential..."
                    value={newDiagnosis.justification}
                    onChange={(e) =>
                      setNewDiagnosis({ ...newDiagnosis, justification: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supporting Findings
                    </label>
                    <input
                      type="text"
                      placeholder="Enter finding and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setNewDiagnosis({
                            ...newDiagnosis,
                            supporting_findings: [
                              ...(newDiagnosis.supporting_findings || []),
                              e.currentTarget.value.trim(),
                            ],
                          });
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {newDiagnosis.supporting_findings && newDiagnosis.supporting_findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {newDiagnosis.supporting_findings.map((finding, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm bg-green-50 px-2 py-1 rounded"
                          >
                            <span className="text-green-700">✓ {finding}</span>
                            <button
                              onClick={() => {
                                setNewDiagnosis({
                                  ...newDiagnosis,
                                  supporting_findings: newDiagnosis.supporting_findings?.filter(
                                    (_, i) => i !== idx
                                  ),
                                });
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contradicting Findings
                    </label>
                    <input
                      type="text"
                      placeholder="Enter finding and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          setNewDiagnosis({
                            ...newDiagnosis,
                            contradicting_findings: [
                              ...(newDiagnosis.contradicting_findings || []),
                              e.currentTarget.value.trim(),
                            ],
                          });
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {newDiagnosis.contradicting_findings && newDiagnosis.contradicting_findings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {newDiagnosis.contradicting_findings.map((finding, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm bg-red-50 px-2 py-1 rounded"
                          >
                            <span className="text-red-700">✗ {finding}</span>
                            <button
                              onClick={() => {
                                setNewDiagnosis({
                                  ...newDiagnosis,
                                  contradicting_findings: newDiagnosis.contradicting_findings?.filter(
                                    (_, i) => i !== idx
                                  ),
                                });
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (newDiagnosis.diagnosis.trim() && newDiagnosis.justification.trim()) {
                      const newDx = {
                        ...newDiagnosis,
                        rank: differential.length + 1,
                      };
                      setDifferential([...differential, newDx]);
                      setNewDiagnosis({
                        diagnosis: '',
                        rank: 0,
                        likelihood: 'Medium',
                        justification: '',
                        supporting_findings: [],
                        contradicting_findings: [],
                      });
                    }
                  }}
                  disabled={!newDiagnosis.diagnosis.trim() || !newDiagnosis.justification.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Add to Differential
                </button>
              </div>
            </div>

            {/* Differential List */}
            {differential.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Your Differential ({differential.length} diagnoses)
                  </h3>
                  <button
                    onClick={() => setDifferential([])}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
                {differential.map((dx, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => {
                                if (idx > 0) {
                                  const newDiff = [...differential];
                                  [newDiff[idx - 1], newDiff[idx]] = [newDiff[idx], newDiff[idx - 1]];
                                  newDiff.forEach((d, i) => (d.rank = i + 1));
                                  setDifferential(newDiff);
                                }
                              }}
                              disabled={idx === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => {
                                if (idx < differential.length - 1) {
                                  const newDiff = [...differential];
                                  [newDiff[idx], newDiff[idx + 1]] = [newDiff[idx + 1], newDiff[idx]];
                                  newDiff.forEach((d, i) => (d.rank = i + 1));
                                  setDifferential(newDiff);
                                }
                              }}
                              disabled={idx === differential.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl font-bold text-gray-400">#{dx.rank}</span>
                              <h4 className="text-lg font-semibold text-gray-900">{dx.diagnosis}</h4>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  dx.likelihood === 'High'
                                    ? 'bg-red-100 text-red-700'
                                    : dx.likelihood === 'Medium'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {dx.likelihood}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{dx.justification}</p>
                            {dx.supporting_findings && dx.supporting_findings.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-600">Supporting:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {dx.supporting_findings.map((f, fidx) => (
                                    <span
                                      key={fidx}
                                      className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded"
                                    >
                                      ✓ {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {dx.contradicting_findings && dx.contradicting_findings.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-600">Against:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {dx.contradicting_findings.map((f, fidx) => (
                                    <span
                                      key={fidx}
                                      className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded"
                                    >
                                      ✗ {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newDiff = differential.filter((_, i) => i !== idx);
                            newDiff.forEach((d, i) => (d.rank = i + 1));
                            setDifferential(newDiff);
                          }}
                          className="ml-4 text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-gray-500">No diagnoses added yet. Add your first diagnosis above.</p>
              </div>
            )}
          </div>
        )}

        {currentTab === "soap" && (
          <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">SOAP Note</h2>
            <p className="text-gray-600 mb-6">
              Document your clinical encounter using the SOAP format. This will be evaluated by AI.
            </p>

            {/* SOAP Note Sections */}
            <div className="space-y-6">
              {/* Subjective */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
                  <h3 className="font-semibold text-blue-900">
                    📋 Subjective
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Chief complaint, HPI, past medical/family/social history, ROS
                  </p>
                </div>
                <div className="p-4 bg-white">
                  <textarea
                    value={soapSubjective}
                    onChange={(e) => setSoapSubjective(e.target.value)}
                    placeholder="Document the patient's history in your own words. Include:
- Chief complaint
- History of present illness (onset, location, duration, character, aggravating/alleviating factors, radiation, timing, severity)
- Past medical history
- Medications
- Allergies
- Family history
- Social history
- Review of systems (pertinent positives and negatives)"
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{soapSubjective.length} characters</span>
                    <span>{selectedHistory.length} history items gathered</span>
                  </div>
                </div>
              </div>

              {/* Objective */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-green-100 px-4 py-3 border-b border-green-200">
                  <h3 className="font-semibold text-green-900">
                    🩺 Objective
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Vital signs, physical examination findings, diagnostic test results
                  </p>
                </div>
                <div className="p-4 bg-white">
                  <textarea
                    value={soapObjective}
                    onChange={(e) => setSoapObjective(e.target.value)}
                    placeholder="Document objective findings including:
- Vital signs (BP, HR, RR, Temp, SpO2, weight, BMI)
- Physical examination findings by system (General, HEENT, Neck, Cardiovascular, Pulmonary, Abdomen, Extremities, Neurological, Skin)
- Laboratory results
- Imaging findings
- Other diagnostic test results

Be specific and use proper medical terminology."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{soapObjective.length} characters</span>
                    <span>
                      {selectedExam.length} exam components • {orderedLabs.length} labs • {orderedImaging.length} imaging
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-yellow-100 px-4 py-3 border-b border-yellow-200">
                  <h3 className="font-semibold text-yellow-900">
                    🧠 Assessment
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your diagnostic impression and differential diagnosis
                  </p>
                </div>
                <div className="p-4 bg-white">
                  <textarea
                    value={soapAssessment}
                    onChange={(e) => setSoapAssessment(e.target.value)}
                    placeholder="Document your clinical assessment including:
- Primary diagnosis with supporting evidence
- Differential diagnoses ranked by likelihood
- Clinical reasoning for each diagnosis
- Severity/acuity assessment
- Pertinent positives and negatives
- Integration of history, physical exam, and test results

Example format:
1. [Primary Diagnosis] - Most likely given [supporting evidence]. Against this: [contradicting evidence].
2. [Second diagnosis] - Consider due to [rationale].
3. [Third diagnosis] - Less likely but cannot exclude because [reasoning]."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{soapAssessment.length} characters</span>
                    <span>{differential.length} diagnoses in differential</span>
                  </div>
                </div>
              </div>

              {/* Plan */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-purple-100 px-4 py-3 border-b border-purple-200">
                  <h3 className="font-semibold text-purple-900">
                    📝 Plan
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Diagnostic workup, treatment, follow-up, patient education
                  </p>
                </div>
                <div className="p-4 bg-white">
                  <textarea
                    value={soapPlan}
                    onChange={(e) => setSoapPlan(e.target.value)}
                    placeholder="Document your management plan including:
- Further diagnostic testing needed
- Therapeutic interventions (medications, procedures)
- Consultations/referrals
- Patient education and counseling
- Follow-up arrangements
- Return precautions

Be specific with:
- Medication names, doses, routes, frequencies
- Timing of follow-up
- Specific education points
- Red flag symptoms to watch for"
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{soapPlan.length} characters</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Stats */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">SOAP Note Completion</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Subjective</div>
                  <div className={`font-semibold ${soapSubjective.length > 100 ? 'text-green-600' : 'text-gray-400'}`}>
                    {soapSubjective.length > 100 ? '✓ Complete' : 'Incomplete'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Objective</div>
                  <div className={`font-semibold ${soapObjective.length > 100 ? 'text-green-600' : 'text-gray-400'}`}>
                    {soapObjective.length > 100 ? '✓ Complete' : 'Incomplete'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Assessment</div>
                  <div className={`font-semibold ${soapAssessment.length > 100 ? 'text-green-600' : 'text-gray-400'}`}>
                    {soapAssessment.length > 100 ? '✓ Complete' : 'Incomplete'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Plan</div>
                  <div className={`font-semibold ${soapPlan.length > 100 ? 'text-green-600' : 'text-gray-400'}`}>
                    {soapPlan.length > 100 ? '✓ Complete' : 'Incomplete'}
                  </div>
                </div>
              </div>
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
