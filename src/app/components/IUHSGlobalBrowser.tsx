"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type GlobalMaterial = {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  title: string;
  category: string;
  subject: string | null;
  system: string | null;
  year: number | null;
  semester: string | null;
  course_code: string | null;
  keywords: string[];
  outline: string[];
  version: number;
  view_count: number;
  download_count: number;
  created_at: string;
};

export default function IUHSGlobalBrowser() {
  const [materials, setMaterials] = useState<GlobalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");

  const supabase = createClient();

  useEffect(() => {
    fetchGlobalMaterials();
  }, []);

  async function fetchGlobalMaterials() {
    setLoading(true);
    const { data, error } = await supabase
      .from("iuhs_global_materials")
      .select("*")
      .eq("status", "active")
      .eq("is_latest_version", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching global materials:", error);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  }

  async function handleView(materialId: string) {
    // Log access
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("material_access_log").insert({
        user_id: user.id,
        material_id: materialId,
        access_type: "view",
      });
    }

    // Increment view count
    await supabase.rpc("increment_view_count", { material_id: materialId });

    // Refresh materials to show updated count
    await fetchGlobalMaterials();
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.keywords?.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.course_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
    const matchesSystem = selectedSystem === "all" || m.system === selectedSystem;

    return matchesSearch && matchesCategory && matchesSystem;
  });

  const categories = Array.from(new Set(materials.map((m) => m.category).filter(Boolean)));
  const systems = Array.from(new Set(materials.map((m) => m.system).filter(Boolean)));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h1 className="mb-2 text-2xl font-bold text-zinc-100">IUHS Global Materials</h1>
        <p className="text-sm text-zinc-400">
          Shared materials from students and administrators
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
              placeholder="Search by title, keywords, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* System Filter */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400">System</label>
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
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
          Showing {filteredMaterials.length} of {materials.length} materials
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-zinc-400">Loading global materials...</div>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="mb-2 text-xl text-zinc-300">No materials found</div>
            <div className="text-sm text-zinc-500">Try adjusting your search filters</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 overflow-auto md:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700"
            >
              {/* Header */}
              <div className="mb-3">
                <h3 className="mb-1 text-sm font-medium text-zinc-200">{material.title}</h3>
                <div className="text-xs text-zinc-500">{material.file_name}</div>
              </div>

              {/* Metadata */}
              <div className="mb-3 space-y-2">
                {/* Category Badge */}
                <div>
                  <span className="rounded bg-blue-900/40 px-2 py-1 text-xs text-blue-300">
                    {material.category}
                  </span>
                </div>

                {/* Subject & System */}
                {(material.subject || material.system) && (
                  <div className="text-xs text-zinc-400">
                    {material.subject && <div>Subject: {material.subject}</div>}
                    {material.system && <div>System: {material.system}</div>}
                  </div>
                )}

                {/* Course Info */}
                {(material.year || material.semester || material.course_code) && (
                  <div className="text-xs text-zinc-400">
                    {material.course_code && <div>Course: {material.course_code}</div>}
                    {material.year && material.semester && (
                      <div>
                        Year {material.year} - {material.semester}
                      </div>
                    )}
                  </div>
                )}

                {/* Keywords */}
                {material.keywords && material.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {material.keywords.slice(0, 4).map((keyword, i) => (
                      <span
                        key={i}
                        className="rounded bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mb-3 flex gap-4 text-xs text-zinc-500">
                <div>👁 {material.view_count} views</div>
                <div>⬇ {material.download_count} downloads</div>
                <div>v{material.version}</div>
              </div>

              {/* File Info */}
              <div className="mb-3 text-xs text-zinc-500">
                Size: {formatFileSize(material.file_size_bytes)}
              </div>

              {/* Outline Preview */}
              {material.outline && material.outline.length > 0 && (
                <details className="mb-3">
                  <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
                    View Outline ({material.outline.length} topics)
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4 text-xs text-zinc-500">
                    {material.outline.slice(0, 5).map((topic, i) => (
                      <li key={i} className="list-disc">
                        {topic}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Actions */}
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <button
                  onClick={() => handleView(material.id)}
                  className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
                >
                  View Material
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
