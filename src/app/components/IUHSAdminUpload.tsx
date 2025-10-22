"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

const SUBJECTS = [
  "Anatomy", "Physiology", "Biochemistry", "Pharmacology", "Pathology",
  "Microbiology", "Immunology", "Genetics", "Behavioral Science",
  "Clinical Skills", "Internal Medicine", "Surgery", "Pediatrics",
  "OB/GYN", "Psychiatry", "Emergency Medicine", "Radiology"
];

const MEDICAL_SYSTEMS = [
  "Cardiology", "Pulmonology", "Gastroenterology", "Neurology",
  "Endocrinology", "Hematology", "Nephrology", "Dermatology",
  "Musculoskeletal", "Reproductive", "Ophthalmology", "ENT"
];

export default function IUHSAdminUpload() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("lecture");
  const [subject, setSubject] = useState("");
  const [system, setSystem] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState("");

  // Check if user is admin
  useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user && user.email === 'info@stephenscode.dev') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    if (!title || !subject) {
      setError("Title and Subject are required");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setDuplicateWarning(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("category", category);
      fd.append("subject", subject);
      if (system) fd.append("system", system);
      if (year) fd.append("year", year);
      if (semester) fd.append("semester", semester);
      if (courseCode) fd.append("courseCode", courseCode);
      if (instructorName) fd.append("instructorName", instructorName);
      if (department) fd.append("department", department);
      if (tags) fd.append("tags", tags);

      const res = await fetch("/api/iuhs-upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (res.status === 409) {
        // Duplicate detected
        setDuplicateWarning(data);
        setError("");
      } else if (!res.ok) {
        setError(data.error || "Upload failed");
        setDuplicateWarning(null);
      } else {
        setSuccess(`Material uploaded successfully! Version ${data.material.version}`);
        setDuplicateWarning(null);
        // Reset form
        setFile(null);
        setTitle("");
        setSubject("");
        setSystem("");
        setYear("");
        setSemester("");
        setCourseCode("");
        setInstructorName("");
        setDepartment("");
        setTags("");
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadNewVersion() {
    if (!file || !duplicateWarning) return;

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("oldMaterialId", duplicateWarning.existing_material.id);

      const res = await fetch("/api/iuhs-upload", {
        method: "PATCH",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to upload new version");
      } else {
        setSuccess(`New version uploaded! Old: v${data.old_version} → New: v${data.new_version}`);
        setDuplicateWarning(null);
        // Reset
        setFile(null);
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="rounded-2xl border border-red-800 bg-red-950/20 p-8 text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h3 className="mb-2 text-xl font-semibold text-red-300">Access Denied</h3>
          <p className="text-sm text-red-400">
            Only IUHS admin (info@stephenscode.dev) can upload to Global Materials Repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-blue-950/30 to-zinc-900/40 p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-3xl">🏛️</span>
          <h2 className="text-2xl font-bold text-zinc-100">IUHS Global Materials Upload</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Upload PowerPoints, PDFs, lectures, and materials for all IUHS students. Files are automatically checked for duplicates using SHA-256 hashing.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-800 bg-green-950/20 p-4">
          <div className="flex items-center gap-2 text-green-300">
            <span className="text-2xl">✅</span>
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-red-300">
            <span className="text-2xl">❌</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-950/20 p-6">
          <div className="mb-4 flex items-center gap-2 text-yellow-300">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-semibold">Duplicate File Detected!</h3>
          </div>
          <p className="mb-4 text-sm text-yellow-200">
            This file already exists in the repository:
          </p>
          <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4">
            <div className="mb-1 font-semibold text-yellow-100">{duplicateWarning.existing_material.title}</div>
            <div className="text-xs text-yellow-300">
              Version {duplicateWarning.existing_material.version} • Uploaded{" "}
              {new Date(duplicateWarning.existing_material.upload_date).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleUploadNewVersion}
              disabled={uploading}
              className="flex-1 rounded-lg bg-yellow-700 px-4 py-3 font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload as New Version (Archives Old)"}
            </button>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-6">
        {/* File Upload */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">File Upload</h3>

          <input
            type="file"
            accept=".pptx,.pdf,.docx,.mp3,.mp4,.m4a,.wav,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Supported: PowerPoint (.pptx), PDF, Word (.docx), Audio (mp3, mp4, m4a, wav), Text (.txt, .md)
          </p>
        </div>

        {/* Required Fields */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">Required Information</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-zinc-300">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Cardiac Physiology"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-blue-600 focus:outline-none"
                required
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Lab</option>
                <option value="clinical_skills">Clinical Skills</option>
                <option value="exam_prep">Exam Prep</option>
                <option value="research">Research</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Subject *</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-blue-600 focus:outline-none"
                required
              >
                <option value="">Select Subject</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Optional Fields */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">Optional Information</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Medical System</label>
              <select
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-blue-600 focus:outline-none"
              >
                <option value="">None</option>
                {MEDICAL_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Academic Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-blue-600 focus:outline-none"
              >
                <option value="">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 focus:border-blue-600 focus:outline-none"
              >
                <option value="">Any Semester</option>
                <option value="fall">Fall</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g., MED-501, ANAT-101"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Instructor Name</label>
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="e.g., Dr. Smith"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Basic Sciences"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-zinc-300">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., high-yield, step1, pathophysiology"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload to IUHS Global Repository"}
        </button>
      </form>

      {/* Info */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-4">
        <h4 className="mb-2 font-semibold text-zinc-300">How It Works</h4>
        <ul className="space-y-1 text-sm text-zinc-400">
          <li>• Files are hashed (SHA-256) to detect duplicates automatically</li>
          <li>• If duplicate found, you can upload as a new version (old one gets archived)</li>
          <li>• All IUHS students can access materials in the Global Repository</li>
          <li>• Content is extracted and indexed for search</li>
          <li>• Usage analytics track views and downloads</li>
        </ul>
      </div>
    </div>
  );
}
