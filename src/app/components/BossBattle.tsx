"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { BossBattleTemplate, InteractiveQuestion } from "@/types/interactiveCoach";
import InteractiveQuestion as QuestionComponent from "./InteractiveQuestion";

interface BossBattleProps {
  template: BossBattleTemplate;
  userId: string;
  onComplete: (xpEarned: number, badgeEarned?: string) => void;
  onExit: () => void;
}

type BattlePhase = "intro" | "active" | "complete";
type BossState = "healthy" | "damaged" | "critical" | "defeated";

export default function BossBattle({ template, userId, onComplete, onExit }: BossBattleProps) {
  const [phase, setPhase] = useState<BattlePhase>("intro");
  const [questions, setQuestions] = useState<InteractiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bossHealth, setBossHealth] = useState(100);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answers, setAnswers] = useState<Array<{ correct: boolean; time: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [showQuestionFeedback, setShowQuestionFeedback] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadBattle();
  }, []);

  async function loadBattle() {
    setLoading(true);

    try {
      // Load questions for each required skill
      const questionPromises = template.required_skills.map((skill) =>
        supabase
          .from("multimodal_questions")
          .select("*")
          .eq("skill_id", skill)
          .eq("difficulty_level", template.difficulty_level)
          .limit(3) // 3 questions per skill
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
        setQuestions(generateBossQuestions());
      }

      // Create coach session
      const { data: session } = await supabase
        .from("coach_sessions")
        .insert({
          user_id: userId,
          session_type: "boss_battle",
          coach_persona: "examiner",
          total_questions: template.required_skills.length * 3,
        })
        .select()
        .single();

      if (session) {
        setSessionId(session.id);
      }
    } catch (error) {
      console.error("Error loading boss battle:", error);
      setQuestions(generateBossQuestions());
    } finally {
      setLoading(false);
    }
  }

  function generateBossQuestions(): InteractiveQuestion[] {
    const questions: InteractiveQuestion[] = [];
    template.required_skills.forEach((skill, skillIndex) => {
      for (let i = 0; i < 3; i++) {
        questions.push({
          type: "multiple_choice",
          data: {
            id: `boss-${skillIndex}-${i}`,
            question: `Boss Battle Question: ${skill} (${i + 1}/3)`,
            options: [
              { id: "a", text: "Correct Answer", isCorrect: true },
              { id: "b", text: "Incorrect Option 1", isCorrect: false },
              { id: "c", text: "Incorrect Option 2", isCorrect: false },
              { id: "d", text: "Incorrect Option 3", isCorrect: false },
            ],
            skill_id: skill,
            explanation: "This is a comprehensive boss battle question.",
          },
        });
      }
    });
    return questions;
  }

  function startBattle() {
    setPhase("active");
  }

  async function handleAnswer(isCorrect: boolean, userAnswer: any, responseTime: number) {
    const newAnswers = [...answers, { correct: isCorrect, time: responseTime }];
    setAnswers(newAnswers);

    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);

      // Damage boss based on streak
      const damage = 10 + streak * 2; // More damage with higher streaks
      const newBossHealth = Math.max(0, bossHealth - damage);
      setBossHealth(newBossHealth);

      // Show feedback
      setShowQuestionFeedback(true);
      setTimeout(() => setShowQuestionFeedback(false), 2000);
    } else {
      setStreak(0);

      // Boss attacks player
      const damage = 15;
      const newPlayerHealth = Math.max(0, playerHealth - damage);
      setPlayerHealth(newPlayerHealth);

      // Show feedback
      setShowQuestionFeedback(true);
      setTimeout(() => setShowQuestionFeedback(false), 2000);

      // Check if player is defeated
      if (newPlayerHealth <= 0) {
        setTimeout(() => completeBattle(false), 2000);
        return;
      }
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
        xp_awarded: isCorrect ? 20 : 0,
      });
    }

    // Check if boss is defeated
    if (bossHealth - (isCorrect ? 10 + streak * 2 : 0) <= 0) {
      setTimeout(() => completeBattle(true), 2000);
      return;
    }

    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 2000);
    } else {
      setTimeout(() => completeBattle(playerHealth > bossHealth), 2000);
    }
  }

  async function completeBattle(victory: boolean) {
    setPhase("complete");

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const accuracy = (score / questions.length) * 100;

    // Calculate XP
    let totalXP = template.xp_reward;
    if (victory) {
      totalXP += Math.floor(playerHealth * 5); // Bonus for remaining health
      totalXP += streak * 10; // Bonus for best streak
    } else {
      totalXP = Math.floor(totalXP * 0.3); // Consolation XP
    }

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
        challenge_id: template.id,
        challenge_type: "boss_battle",
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        score: Math.round(accuracy),
        max_score: 100,
        time_seconds: totalTime,
        was_successful: victory,
        xp_earned: totalXP,
      });

      // Award XP
      await supabase.rpc("award_xp", {
        p_user_id: userId,
        p_amount: totalXP,
        p_reason: `Boss Battle: ${template.name}`,
      });

      // Award badge if victory and badge exists
      if (victory && template.badge_reward) {
        await supabase.from("user_badges").insert({
          user_id: userId,
          badge_id: template.badge_reward,
        });
        onComplete(totalXP, template.badge_reward);
        return;
      }
    }

    onComplete(totalXP);
  }

  function getBossState(): BossState {
    if (bossHealth === 0) return "defeated";
    if (bossHealth <= 25) return "critical";
    if (bossHealth <= 50) return "damaged";
    return "healthy";
  }

  function getBossEmoji(): string {
    const state = getBossState();
    switch (state) {
      case "healthy": return "👹";
      case "damaged": return "😠";
      case "critical": return "😵";
      case "defeated": return "💀";
    }
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Preparing Boss Battle...</p>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    const victory = bossHealth <= 0;
    const accuracy = (score / questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto">
        <div
          className={`rounded-xl border-2 p-8 text-center ${
            victory
              ? "border-purple-600 bg-purple-900/20"
              : "border-red-600 bg-red-900/20"
          }`}
        >
          <div className="text-8xl mb-4">{victory ? "👑" : "💀"}</div>
          <h2 className="text-4xl font-bold mb-2">
            {victory ? (
              <span className="text-purple-300">VICTORY!</span>
            ) : (
              <span className="text-red-300">DEFEATED</span>
            )}
          </h2>
          <p className="text-zinc-400 mb-8">{template.name}</p>

          {/* Battle Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {score}/{questions.length}
              </div>
              <div className="text-xs text-zinc-400">Correct</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-2xl font-bold text-blue-400 mb-1">{Math.round(accuracy)}%</div>
              <div className="text-xs text-zinc-400">Accuracy</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-2xl font-bold text-emerald-400 mb-1">{streak}</div>
              <div className="text-xs text-zinc-400">Best Streak</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-2xl font-bold text-amber-400 mb-1">{playerHealth}HP</div>
              <div className="text-xs text-zinc-400">Remaining</div>
            </div>
          </div>

          {/* Reward */}
          {victory && template.badge_reward && (
            <div className="mb-8 p-6 rounded-lg border-2 border-amber-600 bg-amber-900/20">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-xl font-bold text-amber-300">Badge Unlocked!</div>
              <div className="text-sm text-zinc-400 mt-1">
                Check your badge collection
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            {!victory && (
              <button
                onClick={() => window.location.reload()}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-6 rounded-lg transition"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onExit}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 px-6 rounded-lg transition"
            >
              Back to Challenges
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border-2 border-purple-600 bg-purple-900/20 p-8">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-pulse">👹</div>
            <h2 className="text-3xl font-bold text-purple-300 mb-2">{template.name}</h2>
            <p className="text-zinc-400">{template.description}</p>
            <div className="mt-4 inline-block px-4 py-2 rounded-full bg-purple-900/40 border border-purple-700 text-purple-300 text-sm font-semibold">
              LEVEL {template.difficulty_level} BOSS
            </div>
          </div>

          {/* Battle Info */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-6 mb-8">
            <h3 className="font-semibold text-zinc-200 mb-4">Boss Battle Mechanics:</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">⚔️</span>
                <span>Each correct answer damages the boss (10 HP + streak bonus)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">💔</span>
                <span>Each wrong answer costs you 15 HP</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">🔥</span>
                <span>Build streaks for massive damage multipliers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">💪</span>
                <span>Defeat the boss to earn {template.xp_reward} XP + bonus rewards</span>
              </li>
            </ul>
          </div>

          {/* Required Skills */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-zinc-400 mb-3">Skills Required to Win:</h4>
            <div className="grid grid-cols-2 gap-2">
              {template.required_skills.map((skill, i) => (
                <div
                  key={i}
                  className="text-xs px-3 py-2 rounded bg-purple-900/40 text-purple-300 border border-purple-700 text-center"
                >
                  {skill}
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Duration */}
          <div className="text-center mb-8 text-sm text-zinc-400">
            <span className="text-zinc-300">⏱️</span> Estimated Duration: {template.estimated_duration_minutes} minutes
          </div>

          {/* Start Button */}
          <button
            onClick={startBattle}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-lg transition text-lg shadow-lg shadow-purple-900/50"
          >
            Begin Battle
          </button>

          <button
            onClick={onExit}
            className="w-full mt-3 text-zinc-400 hover:text-zinc-200 py-2"
          >
            Retreat
          </button>
        </div>
      </div>
    );
  }

  // Active Battle
  return (
    <div className="max-w-4xl mx-auto">
      {/* Battle HUD */}
      <div className="mb-6 rounded-xl border-2 border-purple-600 bg-purple-900/10 p-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Boss Health */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-4xl">{getBossEmoji()}</span>
                <div>
                  <div className="text-sm font-medium text-purple-300">BOSS</div>
                  <div className="text-xs text-zinc-400">{template.name}</div>
                </div>
              </div>
              <div className="text-xl font-bold text-purple-300">{bossHealth} HP</div>
            </div>
            <div className="h-4 w-full rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-purple-500 transition-all duration-500"
                style={{ width: `${bossHealth}%` }}
              />
            </div>
          </div>

          {/* Player Health */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-4xl">🛡️</span>
                <div>
                  <div className="text-sm font-medium text-emerald-300">YOU</div>
                  <div className="text-xs text-zinc-400">Medical Student</div>
                </div>
              </div>
              <div className="text-xl font-bold text-emerald-300">{playerHealth} HP</div>
            </div>
            <div className="h-4 w-full rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r transition-all duration-500 ${
                  playerHealth > 50
                    ? "from-emerald-500 to-green-500"
                    : playerHealth > 25
                    ? "from-yellow-500 to-orange-500"
                    : "from-red-500 to-red-600"
                }`}
                style={{ width: `${playerHealth}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streak & Progress */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-zinc-400">Streak</div>
            <div className="text-2xl font-bold text-amber-400">
              {streak > 0 && "🔥"} {streak}x
            </div>
          </div>
          <div>
            <div className="text-zinc-400">Progress</div>
            <div className="text-2xl font-bold text-blue-400">
              {currentQuestionIndex + 1}/{questions.length}
            </div>
          </div>
          <div>
            <div className="text-zinc-400">Score</div>
            <div className="text-2xl font-bold text-emerald-400">{score}</div>
          </div>
        </div>
      </div>

      {/* Battle Feedback */}
      {showQuestionFeedback && (
        <div className="mb-4 text-center">
          {answers[answers.length - 1]?.correct ? (
            <div className="text-2xl font-bold text-purple-300 animate-bounce">
              ⚔️ HIT! -{10 + (streak - 1) * 2} HP to boss!
            </div>
          ) : (
            <div className="text-2xl font-bold text-red-300 animate-bounce">
              💥 BOSS ATTACK! -15 HP!
            </div>
          )}
        </div>
      )}

      {/* Question */}
      {currentQuestion && (
        <QuestionComponent
          question={currentQuestion}
          onSubmit={handleAnswer}
          showFeedback={true}
        />
      )}
    </div>
  );
}
