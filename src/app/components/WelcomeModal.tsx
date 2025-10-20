"use client";

import { useState, useEffect } from "react";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if user has seen welcome modal
    const hasSeenWelcome = localStorage.getItem("med_study_welcome_seen");
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  function handleClose() {
    localStorage.setItem("med_study_welcome_seen", "true");
    setIsOpen(false);
  }

  function nextStep() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to Med Study Partner! 👋",
      content: (
        <div className="space-y-3 text-zinc-300">
          <p>Your AI-powered companion for medical education using the Feynman Technique.</p>
          <div className="rounded-lg bg-zinc-950/50 p-4">
            <h4 className="mb-2 font-medium text-emerald-400">What is this?</h4>
            <p className="text-sm">
              Med Study Partner helps you learn through active recall, Socratic questioning, and
              spaced repetition - the most effective methods for long-term retention.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "🎓 AI Coach Tab",
      content: (
        <div className="space-y-3 text-zinc-300">
          <p>Get real-time Socratic coaching through voice or text:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>
                <strong>Quick Mode:</strong> Hold to talk, ask questions, get probing feedback
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>
                <strong>Lecture Mode:</strong> Teach out loud, coach interrupts with questions
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>
                <strong>Upload Materials:</strong> PDFs/PPTXs to focus coaching on your content
              </span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "🗂️ SRS Review & Materials",
      content: (
        <div className="space-y-3 text-zinc-300">
          <div className="rounded-lg bg-zinc-950/50 p-3">
            <h4 className="mb-2 flex items-center gap-2 font-medium text-emerald-400">
              <span>📚</span> SRS Review Tab
            </h4>
            <p className="text-sm">
              Spaced repetition flashcards using the SM2 algorithm. Create cards manually or review
              existing ones. Cards automatically schedule based on your performance.
            </p>
          </div>
          <div className="rounded-lg bg-zinc-950/50 p-3">
            <h4 className="mb-2 flex items-center gap-2 font-medium text-emerald-400">
              <span>📖</span> Materials Tab
            </h4>
            <p className="text-sm">
              View all your uploaded lecture materials in one place. Search, browse, and reference
              your study content anytime.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "🏥 Clinical Practice",
      content: (
        <div className="space-y-3 text-zinc-300">
          <div className="rounded-lg bg-zinc-950/50 p-3">
            <h4 className="mb-2 flex items-center gap-2 font-medium text-emerald-400">
              <span>💉</span> Vignettes Tab
            </h4>
            <p className="text-sm">
              Generate NBME/USMLE-style clinical cases on-demand. Practice across 13 medical systems
              with randomized scenarios for quick MCQ-style practice.
            </p>
          </div>
          <div className="rounded-lg bg-zinc-950/50 p-3">
            <h4 className="mb-2 flex items-center gap-2 font-medium text-emerald-400">
              <span>🩺</span> Virtual Patients Tab
            </h4>
            <p className="text-sm">
              Interactive DxR-style cases with full patient workups. Take history, perform exams,
              order diagnostics, build differentials, and write SOAP notes with AI feedback.
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-emerald-700 bg-emerald-900/20 p-3">
            <h4 className="mb-2 font-medium text-emerald-300">Quick Start:</h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Go to AI Coach tab and upload a lecture file (optional)</li>
              <li>Try Quick Mode - hold the button and ask a question</li>
              <li>Create some flashcards in the SRS tab</li>
              <li>Practice with vignettes or virtual patient cases</li>
            </ol>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">{currentStep.title}</h2>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">{currentStep.content}</div>

        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all ${
                index === step ? "bg-emerald-500 w-8" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between">
          <button
            onClick={handleClose}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Skip
          </button>
          <button
            onClick={nextStep}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {step < steps.length - 1 ? "Next" : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  );
}
