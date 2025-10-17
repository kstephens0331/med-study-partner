"use client";

import { useEffect, useState } from "react";
import CreateCardModal from "./CreateCardModal";

type Card = {
  id: string;
  front: string;
  back: string;
  source_kind: string | null;
  created_at: string;
  mastery: {
    interval_days: number;
    ease: number;
    reps: number;
    lapses: number;
    due_at: string;
  } | null;
};

export default function SRSDeck() {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDueCards();
  }, []);

  async function fetchDueCards() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cards/due");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch cards");
      }

      setCards(data.cards || []);
    } catch (e: any) {
      setError(e.message || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }

  async function submitReview(quality: number) {
    if (submitting) return;

    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          quality,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setRevealed(false);
      } else {
        // Finished all cards
        await fetchDueCards();
        setCurrentIndex(0);
        setRevealed(false);
      }
    } catch (e: any) {
      setError(e.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReveal() {
    setRevealed(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-2 text-lg text-zinc-300">Loading cards...</div>
          <div className="text-sm text-zinc-500">Fetching your review queue</div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="mb-2 text-xl text-zinc-300">All caught up!</div>
            <div className="mb-4 text-sm text-zinc-500">No cards due for review right now.</div>
            <div className="flex justify-center gap-2">
              <button
                onClick={fetchDueCards}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
              >
                Create New Card
              </button>
            </div>
          </div>
        </div>
        <CreateCardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCardCreated={fetchDueCards}
        />
      </>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <>
      <div className="mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">SRS Review</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-400">
              Card {currentIndex + 1} of {cards.length}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              + New Card
            </button>
          </div>
        </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 w-full rounded-full bg-zinc-800">
        <div
          className="h-2 rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-800 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Card */}
      <div className="mb-6 min-h-64 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        {/* Question */}
        <div className="mb-6">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Question</div>
          <div className="text-lg text-zinc-100">{currentCard.front}</div>
        </div>

        {/* Answer (revealed) */}
        {revealed && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="border-t border-zinc-800 pt-6">
              <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Answer</div>
              <div className="whitespace-pre-wrap text-zinc-200">{currentCard.back}</div>
            </div>

            {/* Mastery info */}
            {currentCard.mastery && (
              <div className="mt-4 flex gap-4 text-xs text-zinc-500">
                <span>Reps: {currentCard.mastery.reps}</span>
                <span>Ease: {currentCard.mastery.ease.toFixed(2)}</span>
                <span>Interval: {currentCard.mastery.interval_days}d</span>
                {currentCard.mastery.lapses > 0 && (
                  <span className="text-rose-400">Lapses: {currentCard.mastery.lapses}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {!revealed ? (
        <button
          onClick={handleReveal}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-lg font-medium text-white hover:bg-emerald-500"
        >
          Reveal Answer
        </button>
      ) : (
        <div className="space-y-2">
          <div className="mb-2 text-center text-xs text-zinc-500">How well did you know it?</div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => submitReview(1)}
              disabled={submitting}
              className="rounded-lg border border-rose-700 bg-rose-900/20 px-4 py-3 text-sm font-medium text-rose-300 hover:bg-rose-800/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Again
              <div className="text-xs text-zinc-500">1</div>
            </button>
            <button
              onClick={() => submitReview(2)}
              disabled={submitting}
              className="rounded-lg border border-orange-700 bg-orange-900/20 px-4 py-3 text-sm font-medium text-orange-300 hover:bg-orange-800/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hard
              <div className="text-xs text-zinc-500">2</div>
            </button>
            <button
              onClick={() => submitReview(3)}
              disabled={submitting}
              className="rounded-lg border border-emerald-700 bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-800/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Good
              <div className="text-xs text-zinc-500">3</div>
            </button>
            <button
              onClick={() => submitReview(4)}
              disabled={submitting}
              className="rounded-lg border border-blue-700 bg-blue-900/20 px-4 py-3 text-sm font-medium text-blue-300 hover:bg-blue-800/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Easy
              <div className="text-xs text-zinc-500">4</div>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <div className="text-center">Again: &lt;1d | Hard: 1-3d</div>
            <div className="text-center">Good: 3-7d | Easy: 7d+</div>
          </div>
        </div>
      )}

      {/* Source indicator */}
      {currentCard.source_kind && (
        <div className="mt-4 text-center text-xs text-zinc-500">
          Source: {currentCard.source_kind}
        </div>
      )}
      </div>

      <CreateCardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCardCreated={fetchDueCards}
      />
    </>
  );
}
