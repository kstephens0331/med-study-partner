"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import { SpeedRoundTemplate, InteractiveQuestion } from "@/types/interactiveCoach";
import InteractiveQuestion as QuestionComponent from "./InteractiveQuestion";

interface SpeedRoundProps {
  template: SpeedRoundTemplate;
  userId: string;
  onComplete: (xpEarned: number) => void;
  onExit: () => void;
}

export default function SpeedRound({ template, userId, onComplete, onExit }: SpeedRoundProps) {
  const [questions, setQuestions] = useState<InteractiveQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(template.time_limit_seconds);
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<Array<{ correct: boolean; time: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const supabase = createClient();

  useEffect(() => {
    loadQuestions();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isActive || isComplete) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          completeRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isComplete]);

  async function loadQuestions() {
    setLoading(true);

    try {
      // Fetch random questions matching the template's target skills
      const { data } = await supabase
        .from("multimodal_questions")
        .select("*")
        .in("skill_id", template.target_skills)
        .eq("difficulty_level", template.difficulty_level)
        .limit(template.question_count);

      if (data && data.length > 0) {
        // Convert to InteractiveQuestion format
        const formattedQuestions: InteractiveQuestion[] = data.map((q) => {
          // For now, all questions are multiple choice
          // In a real implementation, you'd have different question types
          return {
            type: "multiple_choice" as const,
            data: {
              id: q.id,
              question: q.question_text,
              options: [
                { id: "a", text: q.correct_answer, isCorrect: true },
                ...(q.distractors?.options || []).map((opt: string, i: number) => ({
                  id: String.fromCharCode(98 + i), // b, c, d, etc.
                  text: opt,
                  isCorrect: false,
                })),
              ].sort(() => Math.random() - 0.5), // Shuffle options
              skill_id: q.skill_id,
              explanation: q.explanation || "",
              media_url: q.media_url,
            },
          };
        });

        setQuestions(formattedQuestions);
      } else {
        // Generate fallback questions if none exist
        setQuestions(generateFallbackQuestions());
      }

      // Create coach session
      const { data: session } = await supabase
        .from("coach_sessions")
        .insert({
          user_id: userId,
          session_type: "speed_round",
          coach_persona: "examiner",
          total_questions: template.question_count,
        })
        .select()
        .single();

      if (session) {
        setSessionId(session.id);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      setQuestions(generateFallbackQuestions());
    } finally {
      setLoading(false);
    }
  }

  function generateFallbackQuestions(): InteractiveQuestion[] {
    // Generate sample questions for the speed round
    const fallbackQuestions: InteractiveQuestion[] = [];
    for (let i = 0; i < template.question_count; i++) {
      fallbackQuestions.push({
        type: "multiple_choice",
        data: {
          id: `fallback-${i}`,
          question: `Speed Round Question ${i + 1}: Medical knowledge test`,
          options: [
            { id: "a", text: "Correct Answer", isCorrect: true },
            { id: "b", text: "Incorrect Option 1", isCorrect: false },
            { id: "c", text: "Incorrect Option 2", isCorrect: false },
            { id: "d", text: "Incorrect Option 3", isCorrect: false },
          ],
          explanation: "This is a sample question for the speed round.",
        },
      });
    }
    return fallbackQuestions;
  }

  function startRound() {
    setIsActive(true);
    startTimeRef.current = Date.now();
  }

  async function handleAnswer(isCorrect: boolean, userAnswer: any, responseTime: number) {
    // Record answer
    const newAnswers = [...answers, { correct: isCorrect, time: responseTime }];
    setAnswers(newAnswers);

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
        xp_awarded: isCorrect ? 10 : 0,
      });
    }

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 1000); // Brief pause before next question
    } else {
      setTimeout(() => {
        completeRound();
      }, 1500);
    }
  }

  async function completeRound() {
    setIsActive(false);
    setIsComplete(true);

    const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const accuracy = (score / questions.length) * 100;
    const scorePercentage = Math.round(accuracy);

    // Calculate XP based on performance
    const baseXP = 50;
    const bonusXP = Math.floor((scorePercentage / 100) * 100); // Up to 100 bonus XP
    const speedBonus = timeRemaining > 0 ? Math.floor(timeRemaining / 10) : 0; // Bonus for time remaining
    const totalXP = baseXP + bonusXP + speedBonus;

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

      // Create challenge attempt record
      await supabase.from("user_challenge_attempts").insert({
        user_id: userId,
        challenge_id: template.id,
        challenge_type: "speed_round",
        started_at: new Date(startTimeRef.current).toISOString(),
        completed_at: new Date().toISOString(),
        score: scorePercentage,
        max_score: 100,
        time_seconds: totalTime,
        was_successful: scorePercentage >= 70, // 70% is passing
        xp_earned: totalXP,
      });

      // Award XP
      await supabase.rpc("award_xp", {
        p_user_id: userId,
        p_amount: totalXP,
        p_reason: `Speed Round: ${template.name}`,
      });
    }

    onComplete(totalXP);
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const timePercentage = (timeRemaining / template.time_limit_seconds) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Preparing Speed Round...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const accuracy = (score / questions.length) * 100;
    const avgTime = answers.reduce((sum, a) => sum + a.time, 0) / answers.length;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border-2 border-emerald-600 bg-emerald-900/20 p-8 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h2 className="text-3xl font-bold text-emerald-300 mb-2">Speed Round Complete!</h2>
          <p className="text-zinc-400 mb-8">{template.name}</p>

          {/* Score Display */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {score}/{questions.length}
              </div>
              <div className="text-sm text-zinc-400">Questions Correct</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-3xl font-bold text-blue-400 mb-1">{Math.round(accuracy)}%</div>
              <div className="text-sm text-zinc-400">Accuracy</div>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="text-3xl font-bold text-purple-400 mb-1">{avgTime.toFixed(1)}s</div>
              <div className="text-sm text-zinc-400">Avg. Time</div>
            </div>
          </div>

          {/* Performance Message */}
          <div className="mb-8">
            {accuracy >= 90 && (
              <div className="text-lg text-emerald-300">
                🌟 Outstanding! You're a speed demon!
              </div>
            )}
            {accuracy >= 70 && accuracy < 90 && (
              <div className="text-lg text-blue-300">👏 Great job! Keep up the momentum!</div>
            )}
            {accuracy >= 50 && accuracy < 70 && (
              <div className="text-lg text-yellow-300">💪 Good effort! Practice makes perfect!</div>
            )}
            {accuracy < 50 && (
              <div className="text-lg text-orange-300">
                📚 Keep studying! You'll get there!
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-lg transition"
            >
              Try Again
            </button>
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

  if (!isActive) {
    // Pre-start screen
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border-2 border-blue-600 bg-blue-900/20 p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-blue-300 mb-2">{template.name}</h2>
            <p className="text-zinc-400">{template.description}</p>
          </div>

          {/* Rules */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-6 mb-8">
            <h3 className="font-semibold text-zinc-200 mb-4">Speed Round Rules:</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>
                  Answer {template.question_count} questions in {template.time_limit_seconds}{" "}
                  seconds
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Faster correct answers earn bonus XP</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Questions auto-advance after each answer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>Time's up = automatic submission</span>
              </li>
            </ul>
          </div>

          {/* Target Skills */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-zinc-400 mb-2">Focus Areas:</h4>
            <div className="flex flex-wrap gap-2">
              {template.target_skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startRound}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-lg transition text-lg"
          >
            Start Speed Round
          </button>

          <button
            onClick={onExit}
            className="w-full mt-3 text-zinc-400 hover:text-zinc-200 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Active round
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {/* Timer */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Time Remaining</div>
          <div
            className={`text-2xl font-bold ${
              timeRemaining <= 10 ? "text-red-400 animate-pulse" : "text-blue-400"
            }`}
          >
            {timeRemaining}s
          </div>
          <div className="h-1 w-full rounded-full bg-zinc-800 mt-2">
            <div
              className={`h-1 rounded-full transition-all ${
                timeRemaining <= 10 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${timePercentage}%` }}
            />
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Progress</div>
          <div className="text-2xl font-bold text-emerald-400">
            {currentQuestionIndex + 1}/{questions.length}
          </div>
          <div className="h-1 w-full rounded-full bg-zinc-800 mt-2">
            <div
              className="h-1 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Score */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Correct</div>
          <div className="text-2xl font-bold text-purple-400">{score}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {Math.round((score / (currentQuestionIndex + 1)) * 100)}% accuracy
          </div>
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <QuestionComponent
          question={currentQuestion}
          onSubmit={handleAnswer}
          showFeedback={false} // No feedback in speed round - keep moving!
        />
      )}
    </div>
  );
}
