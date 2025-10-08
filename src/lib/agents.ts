export type Agent = {
  id: string;
  name: string;
  role: "Coach" | "Student";
  persona: string;       // short description/persona seed
  focusTags: string[];   // med topics this agent prefers probing
  color: string;         // UI accent
  avatar: "coach" | "heme" | "renal" | "cards" | "micro" | "endo" | "gi" | "neuro";
};

export const AGENTS: Agent[] = [
  {
    id: "coach-core",
    name: "Core Coach",
    role: "Coach",
    persona: "Dynamic Socratic co-instructor. Ask-before-tell. Micro-cases. No rubber-stamping.",
    focusTags: ["cards:acs","renal:anion-gap","heme:coag-initiation"],
    color: "#10b981",
    avatar: "coach",
  },
  {
    id: "stud-01",
    name: "Heme Peer",
    role: "Student",
    persona: "Heme-onc fanatic; nitpicks PT/aPTT edge cases and transfusion logic.",
    focusTags: ["heme:coag-intrinsic","heme:transfusion-reactions","heme:anticoagulation-heparin-doac-warfarin"],
    color: "#ef4444",
    avatar: "heme",
  },
  {
    id: "stud-02",
    name: "Renal Peer",
    role: "Student",
    persona: "Acid–base hawk; asks about delta–delta and Winters’ formula pitfalls.",
    focusTags: ["renal:acid-base-metabolic-acidosis-hag","renal:winters-formula","renal:rta-types-1-2-4"],
    color: "#60a5fa",
    avatar: "renal",
  },
  {
    id: "stud-03",
    name: "Micro Peer",
    role: "Student",
    persona: "Micro/stewardship; pushes empiric→narrowing and diagnostic thresholds.",
    focusTags: ["micro:stewardship-empiric-narrowing","micro:atypicals-mycoplasma-chlamydia-legionella","micro:hiv-basics-art-oi-prophylaxis"],
    color: "#f59e0b",
    avatar: "micro",
  },
];
