"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { DailyChallenge, InteractiveQuestion } from "@/types/interactiveCoach";
import InteractiveQuestion as QuestionComponent from "./InteractiveQuestion";

interface DailyChallengeViewProps {
  challenge: DailyChallenge;
  userId: string;
  onComplete: (xpEarned: number, badgeEarned?: string) => void;
  onExit: () => void;
}

export default function DailyChallengeView({
  challenge,
  userId,
  onComplete,
  onExit,
}: DailyChallengeViewProps) {
  const [questions, setQuestions] = useState<InteractiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<{ correct: boolean; time: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentAnswer, setCurrentAnswer] = useState<{
    isCorrect: boolean;
    userAnswer: any;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadChallenge();
  }, []);

  async function loadChallenge() {
    setLoading(true);

    try {
      // Load 5 questions for each target skill
      const questionPromises = challenge.target_skills.map((skill) =>
        supabase
          .from("multimodal_questions")
          .select("*")
          .eq("skill_id", skill)
          .limit(2) // 2 questions per skill
      );

      const results = await Promise.all(questionPromises);
      const allQuestions = results.flatMap((r) => r.data || []);

      if (allQuestions.length > 0) {
        const formattedQuestions: InteractiveQuestion[] = allQuestions.map((q) => ({
          type: "multiple_choice" as const,
          data: {
            id: q.id,
            question: q.question_text,
            options: [
              { id: "a", text: q.correct_answer, isCorrect: true },
              ...(q.distractors?.options || []).map((opt: string, i: number) => ({
                id: String.fromCharCode(98 + i),
                text: opt,
                isCorrect: false,
              })),
            ].sort(() => Math.random() - 0.5),
            skill_id: q.skill_id,
            explanation: q.explanation || "",
            media_url: q.media_url,
          },
        }));

        setQuestions(formattedQuestions);
      } else {
        setQuestions(generateDailyQuestions());
      }

      // Create coach session
      const { data: session } = await supabase
        .from("coach_sessions")
        .insert({
          user_id: userId,
          session_type: "daily_challenge",
          coach_persona: "socratic",
          total_questions: challenge.target_skills.length * 2,
        })
        .select()
        .single();

      if (session) {
        setSessionId(session.id);
      }
    } catch (error) {
      console.error("Error loading daily challenge:", error);
      setQuestions(generateDailyQuestions());
    } finally {
      setLoading(false);
    }
  }

  function generateDailyQuestions(): InteractiveQuestion[] {
    const questions: InteractiveQuestion[] = [];
    challenge.target_skills.forEach((skill, i) => {
      for (let j = 0; j < 2; j++) {
        questions.push({
          type: "multiple_choice",
          data: {
            id: `daily-${i}-${j}`,
            question: `Daily Challenge: ${challenge.theme} - ${skill} (${j + 1}/2)`,
            options: [
              { id: "a", text: "Correct Answer", isCorrect: true },
              { id: "b", text: "Incorrect Option 1", isCorrect: false },
              { id: "c", text: "Incorrect Option 2", isCorrect: false },
              { id: "d", text: "Incorrect Option 3", isCorrect: false },
            ],
            skill_id: skill,
            explanation: "Daily challenge question explanation.",
          },
        });
      }
    });
    return questions;
  }

  async function handleAnswer(isCorrect: boolean, userAnswer: any, responseTime: number) {
    const newAnswers = [...answers, { correct: isCorrect, time: responseTime }];
    setAnswers(newAnswers);
    setCurrentAnswer({ isCorrect, userAnswer });

    if (isCorrect) {
      setScore(score + 1);
    }

    // Log interaction
    if (sessionId) {
      await supabase.from("coach_interactions").insert({
        session_id: sessionId,
        user_id: userId,
        interaction_number: currentQuestionIndex + 1,
        question_type: questions[currentQuestionIndex].type,
        skill_id: questions[currentQuestionIndex].data.skill_id,
        coach_question: questions[currentQuestionIndex].data.question,
        user_response: JSON.stringify(userAnswer),
        response_time_seconds: responseTime,
        was_correct: isCorrect,
        xp_awarded: isCorrect ? 15 : 5,
      });
    }

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentAnswer(null);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 2500);
    } else {
      setTimeout(() => {
        completeChallenge();
      }, 2500);
    }
  }

  async function completeChallenge() {
    setIsComplete(true);

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const accuracy = (score / questions.length) * 100;
    const scorePercentage = Math.round(accuracy);

    // Calculate XP
    const baseXP = challenge.xp_reward;
    const bonusXP = scorePercentage >= 80 ? 50 : scorePercentage >= 60 ? 25 : 0;
    const totalXP = baseXP + bonusXP;

    // Update session
    if (sessionId) {
      await supabase
        .from("coach_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: totalTime,
          total_correct: score,
          xp_earned: totalXP,
        })
        .eq("id", sessionId);

      // Create challenge attempt
      await supabase.from("user_challenge_attempts").insert({
        user_id: userId,
        challenge_id: challenge.id,
        challenge_type: "daily",
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        score: scorePercentage,
        max_score: 100,
        time_seconds: totalTime,
        was_successful: scorePercentage >= 70,
        xp_earned: totalXP,
      });

      // Award XP
      await supabase.rpc("award_xp", {
        p_user_id: userId,
        p_amount: totalXP,
        p_reason: `Daily Challenge: ${challenge.theme}`,
      });

      // Award badge if eligible and badge exists
      if (scorePercentage >= 90 && challenge.badge_reward) {
        await supabase.from("user_badges").insert({
          user_id: userId,
          badge_id: challenge.badge_reward,
        });
        onComplete(totalXP, challenge.badge_reward);
        return;
      }
    }

    onComplete(totalXP);
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading Daily Challenge...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const accuracy = (score / questions.length) * 100;
    const avgTime = answers.reduce((sum, a) => sum + a.time, 0) / answers.length;
    const totalXP = challenge.xp_reward + (accuracy >= 80 ? 50 : accuracy >= 60 ? 25 : 0);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border-2 border-emerald-600 bg-emerald-900/20 p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-3xl font-bold text-emerald-300 mb-2">
              Daily Challenge Complete!
            </h2>
            <p className="text-zinc-400">{challenge.theme}</p>
          </div>

          {/* Score Display */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {score}/{questions.length}
              </div>
              <div className="text-sm text-zinc-400">Correct</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{Math.round(accuracy)}%</div>
              <div className="text-sm text-zinc-400">Accuracy</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">+{totalXP}</div>
              <div className="text-sm text-zinc-400">XP Earned</div>
            </div>
          </div>

          {/* Performance Badges */}
          <div className="mb-8 space-y-3">
            {accuracy >= 90 && (
              <div className="p-4 rounded-lg border-2 border-amber-600 bg-amber-900/20 text-center">
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-lg font-bold text-amber-300">Perfect Performance!</div>
                <div className="text-sm text-zinc-400">90%+ accuracy bonus</div>
              </div>
            )}
            {accuracy >= 80 && accuracy < 90 && (
              <div className="p-4 rounded-lg border border-emerald-600 bg-emerald-900/20 text-center">
                <div className="text-2xl mb-1">🌟</div>
                <div className="text-lg font-bold text-emerald-300">Excellent Work!</div>
                <div className="text-sm text-zinc-400">+50 XP bonus</div>
              </div>
            )}
            {accuracy >= 60 && accuracy < 80 && (
              <div className="p-4 rounded-lg border border-blue-600 bg-blue-900/20 text-center">
                <div className="text-2xl mb-1">👍</div>
                <div className="text-lg font-bold text-blue-300">Good Job!</div>
                <div className="text-sm text-zinc-400">+25 XP bonus</div>
              </div>
            )}
          </div>

          {/* Streak Info */}
          <div className="mb-8 p-4 rounded-lg border border-zinc-700 bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="text-sm text-zinc-400">Come back tomorrow to continue your streak!</span>
              </div>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={onExit}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Active challenge
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 rounded-xl border-2 border-emerald-600 bg-emerald-900/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📅</span>
            <div>
              <h2 className="font-bold text-emerald-300">{challenge.theme}</h2>
              <p className="text-sm text-zinc-400">Daily Challenge</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">+{challenge.xp_reward}</div>
            <div className="text-xs text-zinc-500">XP Reward</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-zinc-400 mb-1">
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Score */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Correct:</span>
            <span className="font-semibold text-emerald-300">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Accuracy:</span>
            <span className="font-semibold text-blue-300">
              {currentQuestionIndex > 0
                ? Math.round((score / (currentQuestionIndex + 1)) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {currentAnswer && (
        <div
          className={`mb-4 p-4 rounded-lg border-2 text-center animate-bounce ${
            currentAnswer.isCorrect
              ? "border-green-600 bg-green-900/20 text-green-300"
              : "border-red-600 bg-red-900/20 text-red-300"
          }`}
        >
          {currentAnswer.isCorrect ? (
            <>
              <div className="text-2xl mb-1">✓</div>
              <div className="font-semibold">Correct! Great job!</div>
            </>
          ) : (
            <>
              <div className="text-2xl mb-1">✗</div>
              <div className="font-semibold">Incorrect, but keep going!</div>
            </>
          )}
        </div>
      )}

      {/* Question */}
      {currentQuestion && (
        <QuestionComponent question={currentQuestion} onSubmit={handleAnswer} showFeedback={true} />
      )}

      {/* Exit Button */}
      <div className="mt-6 text-center">
        <button
          onClick={onExit}
          className="text-sm text-zinc-400 hover:text-zinc-200 underline"
        >
          Exit Challenge
        </button>
      </div>
    </div>
  );
}
