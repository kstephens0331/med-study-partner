"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import StudentMaterialsBrowser from "./StudentMaterialsBrowser";
import IUHSGlobalBrowser from "./IUHSGlobalBrowser";
import IUHSAdminUpload from "./IUHSAdminUpload";

export default function LectureViewer() {
  const [activeTab, setActiveTab] = useState<"my-materials" | "global" | "admin">("my-materials");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.email === "info@stephenscode.dev") {
        setIsAdmin(true);
      }
    }
    checkAdmin();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800 bg-zinc-950/40 px-4 pb-2 pt-4">
        <button
          onClick={() => setActiveTab("my-materials")}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === "my-materials"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          📚 My Materials
        </button>
        <button
          onClick={() => setActiveTab("global")}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === "global"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          🌐 IUHS Global
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === "admin"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}
          >
            🔐 Admin Upload
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-zinc-950">
        {activeTab === "my-materials" && <StudentMaterialsBrowser />}
        {activeTab === "global" && <IUHSGlobalBrowser />}
        {activeTab === "admin" && isAdmin && <IUHSAdminUpload />}
      </div>
    </div>
  );
}
