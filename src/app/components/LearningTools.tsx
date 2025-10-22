"use client";

import { useState } from "react";
import JeopardyGame from "./JeopardyGame";
import NoteEditor from "./NoteEditor";
import TriviaRace from "./TriviaRace";
import DiagnosisDetective from "./DiagnosisDetective";
import MemoryMatch from "./MemoryMatch";
import PharmacyPrescriber from "./PharmacyPrescriber";
import AnatomyLabeling from "./AnatomyLabeling";
import MedicalTaboo from "./MedicalTaboo";
import BattleRoyale from "./BattleRoyale";
import ClinicalConnect from "./ClinicalConnect";
import MicroIDLab from "./MicroIDLab";
import ECGRhythm from "./ECGRhythm";
import DrugInteraction from "./DrugInteraction";
import PathologyCasino from "./PathologyCasino";

type LearningToolType =
  | "jeopardy"
  | "notes"
  | "trivia"
  | "detective"
  | "memory"
  | "pharmacy"
  | "anatomy"
  | "taboo"
  | "battle"
  | "connect"
  | "micro"
  | "ecg"
  | "drugs"
  | "pathology"
  | null;

interface Tool {
  id: LearningToolType;
  title: string;
  icon: string;
  description: string;
  tag: string;
  color: string;
  borderColor: string;
  tagColor: string;
  hoverFrom: string;
}

const LEARNING_TOOLS: Tool[] = [
  {
    id: "jeopardy",
    title: "Medical Jeopardy",
    icon: "🎯",
    description: "Game-show style questions by specialty. Pick 5 categories, earn points, track progress!",
    tag: "Classic Game",
    color: "from-blue-950/40",
    borderColor: "border-blue-700",
    tagColor: "bg-blue-900/30 text-blue-300",
    hoverFrom: "hover:from-blue-950/60",
  },
  {
    id: "trivia",
    title: "Trivia Race",
    icon: "⚡",
    description: "Rapid-fire MCQs with 10-second timer! Lightning rounds, streak bonuses, leaderboards.",
    tag: "Fast-Paced",
    color: "from-yellow-950/40",
    borderColor: "border-yellow-700",
    tagColor: "bg-yellow-900/30 text-yellow-300",
    hoverFrom: "hover:from-yellow-950/60",
  },
  {
    id: "detective",
    title: "Diagnosis Detective",
    icon: "🕵️",
    description: "Solve mystery cases! Buy clues strategically, make diagnoses, earn efficiency bonuses.",
    tag: "Puzzle",
    color: "from-purple-950/40",
    borderColor: "border-purple-700",
    tagColor: "bg-purple-900/30 text-purple-300",
    hoverFrom: "hover:from-purple-950/60",
  },
  {
    id: "memory",
    title: "Memory Match",
    icon: "🃏",
    description: "Match medical pairs! Drug↔mechanism, disease↔pathogen. Timed challenges, multiplayer mode.",
    tag: "Memory",
    color: "from-pink-950/40",
    borderColor: "border-pink-700",
    tagColor: "bg-pink-900/30 text-pink-300",
    hoverFrom: "hover:from-pink-950/60",
  },
  {
    id: "pharmacy",
    title: "Pharmacy Prescriber",
    icon: "💊",
    description: "Write realistic prescriptions! Check interactions, contraindications, dosing. Get scored.",
    tag: "Practical",
    color: "from-green-950/40",
    borderColor: "border-green-700",
    tagColor: "bg-green-900/30 text-green-300",
    hoverFrom: "hover:from-green-950/60",
  },
  {
    id: "anatomy",
    title: "Anatomy Speed Label",
    icon: "🫀",
    description: "Drag-and-drop labeling with timer! Different systems, progressive difficulty, speed bonuses.",
    tag: "Visual",
    color: "from-red-950/40",
    borderColor: "border-red-700",
    tagColor: "bg-red-900/30 text-red-300",
    hoverFrom: "hover:from-red-950/60",
  },
  {
    id: "taboo",
    title: "Medical Taboo",
    icon: "🗣️",
    description: "Describe terms without forbidden words! 60-second rounds, multiplayer teams, AI judge.",
    tag: "Social",
    color: "from-orange-950/40",
    borderColor: "border-orange-700",
    tagColor: "bg-orange-900/30 text-orange-300",
    hoverFrom: "hover:from-orange-950/60",
  },
  {
    id: "battle",
    title: "Step 1 Battle Royale",
    icon: "⚔️",
    description: "Last one standing wins! Simultaneous MCQs, 15 seconds each, wrong answer = eliminated.",
    tag: "Competitive",
    color: "from-red-950/40",
    borderColor: "border-red-700",
    tagColor: "bg-red-900/30 text-red-300",
    hoverFrom: "hover:from-red-950/60",
  },
  {
    id: "connect",
    title: "Clinical Connect",
    icon: "🧩",
    description: "Build knowledge webs! Connect concepts across disciplines, discover hidden relationships.",
    tag: "Creative",
    color: "from-cyan-950/40",
    borderColor: "border-cyan-700",
    tagColor: "bg-cyan-900/30 text-cyan-300",
    hoverFrom: "hover:from-cyan-950/60",
  },
  {
    id: "micro",
    title: "Micro ID Lab",
    icon: "🦠",
    description: "Virtual microbiology! Order gram stains, cultures, tests. Identify organisms efficiently.",
    tag: "Simulation",
    color: "from-lime-950/40",
    borderColor: "border-lime-700",
    tagColor: "bg-lime-900/30 text-lime-300",
    hoverFrom: "hover:from-lime-950/60",
  },
  {
    id: "ecg",
    title: "ECG Rhythm Master",
    icon: "💓",
    description: "Rapid rhythm interpretation! Identify in 10 seconds, treat-or-not decisions, ACLS scenarios.",
    tag: "Essential",
    color: "from-rose-950/40",
    borderColor: "border-rose-700",
    tagColor: "bg-rose-900/30 text-rose-300",
    hoverFrom: "hover:from-rose-950/60",
  },
  {
    id: "drugs",
    title: "Drug Interaction Sim",
    icon: "⚗️",
    description: "Build safe medication regimens! Watch for interactions, QTc prolongation, renal dosing.",
    tag: "Safety",
    color: "from-violet-950/40",
    borderColor: "border-violet-700",
    tagColor: "bg-violet-900/30 text-violet-300",
    hoverFrom: "hover:from-violet-950/60",
  },
  {
    id: "pathology",
    title: "Pathology Casino",
    icon: "🎰",
    description: "Bet on histology slides! Choose confidence levels, progressive reveal, build your points bank.",
    tag: "Risk/Reward",
    color: "from-amber-950/40",
    borderColor: "border-amber-700",
    tagColor: "bg-amber-900/30 text-amber-300",
    hoverFrom: "hover:from-amber-950/60",
  },
  {
    id: "notes",
    title: "Study Notes",
    icon: "📝",
    description: "Rich text editor with folders, tags, auto-save. Organize all your medical school notes.",
    tag: "Productivity",
    color: "from-emerald-950/40",
    borderColor: "border-emerald-700",
    tagColor: "bg-emerald-900/30 text-emerald-300",
    hoverFrom: "hover:from-emerald-950/60",
  },
];

export default function LearningTools() {
  const [selectedTool, setSelectedTool] = useState<LearningToolType>(null);

  // Route to selected tool
  if (selectedTool === "jeopardy") return <JeopardyGame onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "notes") return <NoteEditor onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "trivia") return <TriviaRace onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "detective") return <DiagnosisDetective onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "memory") return <MemoryMatch onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "pharmacy") return <PharmacyPrescriber onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "anatomy") return <AnatomyLabeling onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "taboo") return <MedicalTaboo onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "battle") return <BattleRoyale onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "connect") return <ClinicalConnect onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "micro") return <MicroIDLab onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "ecg") return <ECGRhythm onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "drugs") return <DrugInteraction onExit={() => setSelectedTool(null)} />;
  if (selectedTool === "pathology") return <PathologyCasino onExit={() => setSelectedTool(null)} />;

  // Tool selection screen
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 p-8">
        <h2 className="text-3xl font-bold text-zinc-100">🎮 Interactive Learning Tools</h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-400">
          14 fun, game-based study tools to help you master medical knowledge. Choose your favorite way to learn!
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-300">
            Game-Based Learning
          </span>
          <span className="rounded-full bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-300">
            Active Recall
          </span>
          <span className="rounded-full bg-purple-900/30 px-3 py-1 text-xs font-medium text-purple-300">
            Spaced Repetition
          </span>
          <span className="rounded-full bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-300">
            Clinical Reasoning
          </span>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {LEARNING_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`group rounded-2xl border border-zinc-800 bg-gradient-to-br ${tool.color} to-zinc-900/40 p-5 text-left transition hover:border-opacity-100 ${tool.borderColor} ${tool.hoverFrom} hover:scale-[1.02]`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900/60 text-3xl shadow-lg">
                {tool.icon}
              </div>
              <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tool.tagColor}`}>
                {tool.tag}
              </div>
            </div>

            <h3 className="mb-2 text-lg font-bold text-zinc-100">
              {tool.title}
            </h3>

            <p className="text-xs leading-relaxed text-zinc-400">
              {tool.description}
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-500 transition group-hover:gap-3 group-hover:text-zinc-300">
              Start Playing
              <span className="text-sm">→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Stats Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-300">📊 Your Learning Stats</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/40 p-4">
            <div className="text-2xl font-bold text-blue-400">0</div>
            <div className="text-sm text-zinc-400">Games Played</div>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/40 p-4">
            <div className="text-2xl font-bold text-emerald-400">0</div>
            <div className="text-sm text-zinc-400">Total Points</div>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/40 p-4">
            <div className="text-2xl font-bold text-purple-400">0%</div>
            <div className="text-sm text-zinc-400">Accuracy</div>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/40 p-4">
            <div className="text-2xl font-bold text-amber-400">0</div>
            <div className="text-sm text-zinc-400">Study Notes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
