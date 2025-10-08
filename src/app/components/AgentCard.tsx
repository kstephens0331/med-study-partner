"use client";
import { motion } from "framer-motion";
import type { Agent } from "@/lib/agents";

type Props = {
  agent: Agent;
  active: boolean;
  onToggle: (id: string) => void;
};

export default function AgentCard({ agent, active, onToggle }: Props) {
  return (
    <motion.button
      onClick={() => onToggle(agent.id)}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${
        active ? "border-emerald-500/60 bg-zinc-900/60" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
      }`}
      style={{ boxShadow: active ? `0 0 0 1px ${agent.color} inset` : undefined }}
      title={agent.persona}
    >
      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: agent.color }} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{agent.name}</div>
          <div className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">{agent.role}</div>
        </div>
        <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{agent.persona}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.focusTags.slice(0, 3).map((t) => (
            <span key={t} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}
