"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  system: string | null;
  color: string;
  is_favorite: boolean;
  is_pinned: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface NoteEditorProps {
  onExit: () => void;
}

const MEDICAL_SYSTEMS = [
  "Cardiology",
  "Pulmonology",
  "Gastroenterology",
  "Neurology",
  "Endocrinology",
  "Hematology",
  "Nephrology",
  "Psychiatry",
  "Pediatrics",
  "OB/GYN",
  "Pharmacology",
  "Pathology",
  "Microbiology",
  "Genetics",
];

const NOTE_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

export default function NoteEditor({ onExit }: NoteEditorProps) {
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [filterSystem, setFilterSystem] = useState<string | null>(null);

  // Editor state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("General");
  const [system, setSystem] = useState<string | null>(null);
  const [color, setColor] = useState("#3b82f6");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Auto-save when editing
  useEffect(() => {
    if (isEditing && selectedNote) {
      const timeoutId = setTimeout(() => {
        saveNote();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [title, content, folder, system, color, tags, isFavorite, isPinned]);

  async function loadNotes() {
    const { data, error } = await supabase
      .from("study_notes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading notes:", error);
      return;
    }

    setNotes(data || []);
  }

  async function createNewNote() {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    const { data, error } = await supabase
      .from("study_notes")
      .insert({
        title: title || "Untitled Note",
        content,
        folder,
        system,
        color,
        tags,
        is_favorite: isFavorite,
        is_pinned: isPinned,
        word_count: wordCount,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return;
    }

    setSelectedNote(data);
    setNotes([data, ...notes]);
    setSaveStatus("saved");
  }

  async function saveNote() {
    if (!selectedNote) {
      await createNewNote();
      return;
    }

    setSaveStatus("saving");
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    const { error } = await supabase
      .from("study_notes")
      .update({
        title: title || "Untitled Note",
        content,
        folder,
        system,
        color,
        tags,
        is_favorite: isFavorite,
        is_pinned: isPinned,
        word_count: wordCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedNote.id);

    if (error) {
      console.error("Error saving note:", error);
      setSaveStatus("unsaved");
      return;
    }

    setSaveStatus("saved");
    loadNotes(); // Refresh list
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;

    const { error } = await supabase.from("study_notes").delete().eq("id", noteId);

    if (error) {
      console.error("Error deleting note:", error);
      return;
    }

    setNotes(notes.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  }

  function startNewNote() {
    setSelectedNote(null);
    setIsEditing(true);
    setTitle("");
    setContent("");
    setFolder("General");
    setSystem(null);
    setColor("#3b82f6");
    setTags([]);
    setIsFavorite(false);
    setIsPinned(false);
    setSaveStatus("unsaved");
  }

  function openNote(note: Note) {
    setSelectedNote(note);
    setIsEditing(true);
    setTitle(note.title);
    setContent(note.content);
    setFolder(note.folder);
    setSystem(note.system);
    setColor(note.color);
    setTags(note.tags);
    setIsFavorite(note.is_favorite);
    setIsPinned(note.is_pinned);
    setSaveStatus("saved");
  }

  function addTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
      setSaveStatus("unsaved");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    setSaveStatus("unsaved");
  }

  const filteredNotes = notes.filter((note) => {
    if (searchQuery && !note.title.toLowerCase().includes(searchQuery.toLowerCase()) && !note.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterFolder && note.folder !== filterFolder) return false;
    if (filterSystem && note.system !== filterSystem) return false;
    return true;
  });

  const folders = Array.from(new Set(notes.map((n) => n.folder)));

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar - Notes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-bold text-zinc-100">Study Notes</h2>
          <button
            onClick={onExit}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            ← Back
          </button>
        </div>

        {/* New Note Button */}
        <button
          onClick={startNewNote}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
        >
          + New Note
        </button>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
        />

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={filterFolder || ""}
            onChange={(e) => setFilterFolder(e.target.value || null)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">All Folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={filterSystem || ""}
            onChange={(e) => setFilterSystem(e.target.value || null)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">All Systems</option>
            {MEDICAL_SYSTEMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Notes List */}
        <div className="space-y-2">
          {filteredNotes.length === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-center text-sm text-zinc-500">
              No notes found
            </div>
          )}

          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => openNote(note)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                selectedNote?.id === note.id
                  ? "border-emerald-600 bg-emerald-950/50"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
              style={{ borderLeftWidth: "4px", borderLeftColor: note.color }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="truncate font-medium text-zinc-100">{note.title}</div>
                <div className="flex gap-1">
                  {note.is_pinned && <span className="text-xs">📌</span>}
                  {note.is_favorite && <span className="text-xs">⭐</span>}
                </div>
              </div>
              <div className="mb-1 truncate text-xs text-zinc-400">{note.content.substring(0, 60)}...</div>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>{note.folder}</span>
                <span>{note.word_count} words</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus("unsaved");
                }}
                placeholder="Note title..."
                className="border-none bg-transparent text-xl font-bold text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-sm ${saveStatus === "saved" ? "text-emerald-400" : saveStatus === "saving" ? "text-yellow-400" : "text-zinc-500"}`}>
                {saveStatus === "saved" && "✓ Saved"}
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "unsaved" && "Unsaved"}
              </div>
              <button
                onClick={() => saveNote()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Save Now
              </button>
            </div>
          </div>

          {/* Editor Toolbar */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Folder</label>
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => {
                    setFolder(e.target.value);
                    setSaveStatus("unsaved");
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">System</label>
                <select
                  value={system || ""}
                  onChange={(e) => {
                    setSystem(e.target.value || null);
                    setSaveStatus("unsaved");
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">None</option>
                  {MEDICAL_SYSTEMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Color</label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setColor(c.value);
                        setSaveStatus("unsaved");
                      }}
                      className={`h-8 w-8 rounded-lg border-2 transition ${
                        color === c.value ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setIsPinned(!isPinned);
                    setSaveStatus("unsaved");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    isPinned
                      ? "border-blue-600 bg-blue-950/50 text-blue-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  📌 Pin
                </button>
                <button
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    setSaveStatus("unsaved");
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    isFavorite
                      ? "border-yellow-600 bg-yellow-950/50 text-yellow-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  ⭐ Fav
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium text-zinc-400">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-zinc-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag..."
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Text Editor */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveStatus("unsaved");
              }}
              placeholder="Start typing your notes here..."
              className="min-h-[500px] w-full resize-none border-none bg-transparent font-mono text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{content.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>{content.length} characters</span>
            </div>
          </div>

          {/* Delete Button */}
          {selectedNote && (
            <button
              onClick={() => selectedNote && deleteNote(selectedNote.id)}
              className="w-full rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 font-medium text-red-400 transition hover:bg-red-950/50"
            >
              Delete Note
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <div>
            <div className="mb-4 text-6xl">📝</div>
            <h3 className="mb-2 text-xl font-semibold text-zinc-300">No Note Selected</h3>
            <p className="mb-6 text-sm text-zinc-500">Select a note from the list or create a new one</p>
            <button
              onClick={startNewNote}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
              Create New Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
