"use client";

import { useEffect, useState } from "react";

type Material = {
  id: string;
  title: string;
  file_type: string | null;
  content_text: string;
  created_at: string;
  updated_at: string;
};

export default function LectureViewer() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch materials");
      }

      setMaterials(data.materials || []);
      if (data.materials && data.materials.length > 0) {
        setSelectedMaterial(data.materials[0]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  }

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.content_text && m.content_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-2 text-lg text-zinc-300">Loading materials...</div>
          <div className="text-sm text-zinc-500">Fetching your uploaded content</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-rose-800 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-2 text-xl text-zinc-300">No materials yet</div>
          <div className="text-sm text-zinc-500">
            Upload a PDF or PPTX file from the main page to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Sidebar - Material List */}
      <div className="w-80 flex-shrink-0">
        <div className="mb-4">
          <h2 className="mb-2 text-xl font-semibold">Uploaded Materials</h2>
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          {filteredMaterials.map((material) => (
            <button
              key={material.id}
              onClick={() => setSelectedMaterial(material)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                selectedMaterial?.id === material.id
                  ? "border-emerald-600 bg-emerald-900/20"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <div className="mb-1 font-medium text-zinc-200">{material.title}</div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-800 px-2 py-0.5 uppercase">
                  {material.file_type || "unknown"}
                </span>
                <span>{new Date(material.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Viewer */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {selectedMaterial ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-zinc-800 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">{selectedMaterial.title}</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                <span>Uploaded: {new Date(selectedMaterial.created_at).toLocaleString()}</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 uppercase">
                  {selectedMaterial.file_type}
                </span>
                <span>
                  {selectedMaterial.content_text?.length.toLocaleString() || 0} characters
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedMaterial.content_text ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
                    {selectedMaterial.content_text}
                  </pre>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  No content available
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-zinc-800 p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedMaterial.content_text) {
                      navigator.clipboard.writeText(selectedMaterial.content_text);
                    }
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Select a material to view
          </div>
        )}
      </div>
    </div>
  );
}
