"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Material = {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  title: string;
  material_type: string;
  block_id: string | null;
  block_name: string | null;
  document_date: string | null;
  uploaded_at: string;
  shared_to_global: boolean;
  keywords: string[];
  outline: string[];
  storage_path: string;
};

type Block = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  position: number;
};

export default function StudentMaterialsBrowser() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [newBlockName, setNewBlockName] = useState("");
  const [showNewBlock, setShowNewBlock] = useState(false);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>("auto");

  const supabase = createClient();

  useEffect(() => {
    fetchBlocks();
    fetchMaterials();
  }, []);

  async function fetchBlocks() {
    const { data, error } = await supabase
      .from("material_blocks")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching blocks:", error);
    } else {
      setBlocks(data || []);
    }
  }

  async function fetchMaterials() {
    setLoading(true);
    const { data, error } = await supabase
      .from("student_materials")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching materials:", error);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedBlock) {
        formData.append("blockId", selectedBlock);
      }
      if (selectedMaterialType !== "auto") {
        formData.append("materialType", selectedMaterialType);
      }

      const res = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 409) {
        setUploadError(`Duplicate file: ${data.message}`);
      } else if (!res.ok) {
        setUploadError(data.error || "Upload failed");
      } else {
        let message = "File uploaded successfully!";
        if (data.globalSharing) {
          message += ` ${data.globalSharing.message}`;
        }
        setUploadSuccess(message);
        await fetchMaterials();
      }

      e.target.value = "";
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateBlock() {
    if (!newBlockName.trim()) return;

    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBlockName }),
      });

      if (res.ok) {
        setNewBlockName("");
        setShowNewBlock(false);
        await fetchBlocks();
      }
    } catch (err) {
      console.error("Error creating block:", err);
    }
  }

  async function handleMoveToBlock(materialId: string, blockId: string | null) {
    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_id: blockId }),
      });

      if (res.ok) {
        await fetchMaterials();
      }
    } catch (err) {
      console.error("Error moving material:", err);
    }
  }

  async function handleDelete(materialId: string) {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchMaterials();
      }
    } catch (err) {
      console.error("Error deleting material:", err);
    }
  }

  const filteredMaterials = materials.filter((m) => {
    if (selectedBlock === "unassigned") return !m.block_id;
    if (selectedBlock === null) return true;
    return m.block_id === selectedBlock;
  });

  const unassignedCount = materials.filter((m) => !m.block_id).length;

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Sidebar - Blocks */}
      <div className="w-64 flex-shrink-0">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-4 text-lg font-semibold text-zinc-200">Study Blocks</h2>

          {/* All Materials */}
          <button
            onClick={() => setSelectedBlock(null)}
            className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedBlock === null
                ? "bg-blue-600 text-white"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="mr-2">📚</span>
            All Materials ({materials.length})
          </button>

          {/* Unassigned */}
          <button
            onClick={() => setSelectedBlock("unassigned")}
            className={`mb-4 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedBlock === "unassigned"
                ? "bg-blue-600 text-white"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="mr-2">📂</span>
            Unassigned ({unassignedCount})
          </button>

          {/* Blocks List */}
          <div className="space-y-2">
            {blocks.map((block) => {
              const blockMaterialCount = materials.filter((m) => m.block_id === block.id).length;
              return (
                <button
                  key={block.id}
                  onClick={() => setSelectedBlock(block.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedBlock === block.id
                      ? "text-white"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                  style={{
                    backgroundColor: selectedBlock === block.id ? block.color : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="mr-2">{block.icon}</span>
                      {block.name}
                    </span>
                    <span className="text-xs opacity-70">({blockMaterialCount})</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* New Block */}
          {showNewBlock ? (
            <div className="mt-4 space-y-2">
              <input
                type="text"
                placeholder="Block name..."
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateBlock()}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateBlock}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewBlock(false);
                    setNewBlockName("");
                  }}
                  className="flex-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBlock(true)}
              className="mt-4 w-full rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            >
              + New Block
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Upload Section */}
        <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">Upload Material</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-3">
              <input
                type="file"
                accept=".pptx,.pdf,.docx,.txt,.md,.note,.notes"
                onChange={handleUpload}
                disabled={uploading}
                className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-white hover:file:bg-emerald-500 file:disabled:bg-zinc-700 file:disabled:cursor-not-allowed"
              />
            </label>

            <select
              value={selectedMaterialType}
              onChange={(e) => setSelectedMaterialType(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200"
            >
              <option value="auto">Auto-detect type</option>
              <option value="lecture">Lecture</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="textbook">Textbook</option>
              <option value="notes">Notes (Personal)</option>
            </select>

            {uploading && <span className="text-sm text-emerald-400">Uploading...</span>}
          </div>

          {uploadError && (
            <div className="mt-3 rounded-lg border border-rose-800 bg-rose-900/20 px-3 py-2 text-sm text-rose-300">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 rounded-lg border border-emerald-800 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-300">
              {uploadSuccess}
            </div>
          )}
          <div className="mt-3 text-xs text-zinc-500">
            Lectures, PowerPoints, and Textbooks are shared to IUHS Global. Notes stay personal.
          </div>
        </div>

        {/* Materials Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-zinc-400">Loading materials...</div>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="mb-2 text-xl text-zinc-300">No materials yet</div>
              <div className="text-sm text-zinc-500">Upload a file to get started</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700"
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-medium text-zinc-200">{material.title}</h3>
                    <div className="text-xs text-zinc-500">{material.file_name}</div>
                  </div>
                  <div className="ml-2 flex gap-1">
                    {material.shared_to_global && (
                      <span
                        className="rounded bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300"
                        title="Shared to IUHS Global"
                      >
                        🌐
                      </span>
                    )}
                  </div>
                </div>

                {/* Type Badge */}
                <div className="mb-3">
                  <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                    {material.material_type}
                  </span>
                </div>

                {/* Keywords */}
                {material.keywords && material.keywords.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {material.keywords.slice(0, 3).map((keyword, i) => (
                      <span key={i} className="rounded bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-400">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                {/* Date */}
                <div className="mb-3 text-xs text-zinc-500">
                  {material.document_date
                    ? `Created: ${new Date(material.document_date).toLocaleDateString()}`
                    : `Uploaded: ${new Date(material.uploaded_at).toLocaleDateString()}`}
                </div>

                {/* Actions */}
                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <select
                    value={material.block_id || ""}
                    onChange={(e) => handleMoveToBlock(material.id, e.target.value || null)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300"
                  >
                    <option value="">Unassigned</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.icon} {block.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(material.id)}
                    className="w-full rounded-md bg-rose-900/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
