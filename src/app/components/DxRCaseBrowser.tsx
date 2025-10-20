"use client";

import { useState, useEffect } from "react";
import { DxRCase, DxRDifficulty, DxRFilterOptions } from "@/types/dxr";
import { createBrowserClient } from "@/lib/supabaseBrowser";

interface DxRCaseBrowserProps {
  onSelectCase: (caseData: DxRCase) => void;
}

export default function DxRCaseBrowser({ onSelectCase }: DxRCaseBrowserProps) {
  const [cases, setCases] = useState<DxRCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DxRFilterOptions>({});
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = createBrowserClient();

  useEffect(() => {
    fetchCases();
  }, [filters]);

  async function fetchCases() {
    setLoading(true);
    let query = supabase
      .from("dxr_cases")
      .select("*")
      .order("case_number", { ascending: true });

    // Apply filters
    if (filters.difficulty) {
      query = query.eq("difficulty", filters.difficulty);
    }
    if (filters.system) {
      query = query.eq("system", filters.system);
    }
    if (filters.setting) {
      query = query.eq("setting", filters.setting);
    }
    if (filters.commonOnly) {
      query = query.eq("is_common", true);
    }
    if (filters.rareOnly) {
      query = query.eq("is_rare", true);
    }
    if (filters.emergencyOnly) {
      query = query.eq("is_emergency", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching cases:", error);
      setLoading(false);
      return;
    }

    setCases(data || []);
    setLoading(false);
  }

  const filteredCases = cases.filter((c) =>
    searchTerm
      ? c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getDifficultyColor = (difficulty: DxRDifficulty) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-orange-100 text-orange-800";
      case "expert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Virtual Patient Cases
        </h2>
        <p className="text-gray-600 mb-4">
          Select a case to begin your clinical encounter. Practice your history
          taking, physical exam, diagnostic reasoning, and clinical documentation.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search cases by title or chief complaint..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              value={filters.difficulty || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  difficulty: e.target.value as DxRDifficulty | undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          {/* System Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System
            </label>
            <select
              value={filters.system || ""}
              onChange={(e) =>
                setFilters({ ...filters, system: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Systems</option>
              <option value="heme">Hematology</option>
              <option value="renal">Renal</option>
              <option value="cards">Cardiology</option>
              <option value="neuro">Neurology</option>
              <option value="pulm">Pulmonary</option>
              <option value="endo">Endocrine</option>
              <option value="gi">Gastroenterology</option>
              <option value="micro">Infectious Disease</option>
              <option value="obgyn">OB/GYN</option>
              <option value="psych">Psychiatry</option>
              <option value="peds">Pediatrics</option>
            </select>
          </div>

          {/* Setting Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setting
            </label>
            <select
              value={filters.setting || ""}
              onChange={(e) =>
                setFilters({ ...filters, setting: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Settings</option>
              <option value="outpatient">Outpatient</option>
              <option value="emergency">Emergency</option>
              <option value="inpatient">Inpatient</option>
              <option value="icu">ICU</option>
              <option value="clinic">Clinic</option>
            </select>
          </div>

          {/* Case Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Case Type
            </label>
            <select
              value={
                filters.commonOnly
                  ? "common"
                  : filters.rareOnly
                  ? "rare"
                  : filters.emergencyOnly
                  ? "emergency"
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                setFilters({
                  ...filters,
                  commonOnly: value === "common" ? true : undefined,
                  rareOnly: value === "rare" ? true : undefined,
                  emergencyOnly: value === "emergency" ? true : undefined,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.difficulty ||
          filters.system ||
          filters.setting ||
          filters.commonOnly ||
          filters.rareOnly ||
          filters.emergencyOnly) && (
          <button
            onClick={() => setFilters({})}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Case List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading cases...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No cases found matching your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCases.map((caseData) => (
              <div
                key={caseData.id}
                onClick={() => onSelectCase(caseData)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
              >
                {/* Case Number */}
                <div className="text-xs text-gray-500 mb-2">
                  Case #{caseData.case_number}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-2">
                  {caseData.title}
                </h3>

                {/* Chief Complaint */}
                <p className="text-sm text-gray-600 mb-3">
                  {caseData.chief_complaint}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(
                      caseData.difficulty
                    )}`}
                  >
                    {caseData.difficulty}
                  </span>
                  {caseData.system && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {caseData.system}
                    </span>
                  )}
                  {caseData.setting && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                      {caseData.setting}
                    </span>
                  )}
                  {caseData.is_emergency && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                      Emergency
                    </span>
                  )}
                  {caseData.is_rare && (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                      Rare
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600 text-center">
          Showing {filteredCases.length} of {cases.length} cases
        </p>
      </div>
    </div>
  );
}
