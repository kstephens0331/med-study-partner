"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

interface JeopardyQuestion {
  id: string;
  category: string;
  point_value: number;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: string;
}

interface JeopardyGameProps {
  onExit: () => void;
}

export default function JeopardyGame({ onExit }: JeopardyGameProps) {
  const supabase = createClient();

  const [gameState, setGameState] = useState<"setup" | "playing" | "question" | "answer" | "finished">("setup");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [board, setBoard] = useState<(JeopardyQuestion | null)[][]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<JeopardyQuestion | null>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const pointValues = [100, 200, 300, 400, 500];

  // Load available categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data, error } = await supabase
      .from("jeopardy_questions")
      .select("category")
      .order("category");

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    // Get unique categories
    const uniqueCategories = Array.from(new Set(data?.map((q) => q.category) || []));
    setCategories(uniqueCategories);
  }

  async function startGame() {
    if (selectedCategories.length !== 5) {
      alert("Please select exactly 5 categories");
      return;
    }

    // Load questions for selected categories
    const boardData: (JeopardyQuestion | null)[][] = [];

    for (const category of selectedCategories) {
      const categoryQuestions: (JeopardyQuestion | null)[] = [];

      for (const pointValue of pointValues) {
        // Get one question for this category/point combination
        const { data, error } = await supabase
          .from("jeopardy_questions")
          .select("*")
          .eq("category", category)
          .eq("point_value", pointValue)
          .limit(1);

        if (error || !data || data.length === 0) {
          categoryQuestions.push(null);
        } else {
          categoryQuestions.push(data[0]);
        }
      }

      boardData.push(categoryQuestions);
    }

    setBoard(boardData);

    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from("jeopardy_sessions")
      .insert({
        selected_categories: selectedCategories,
      })
      .select()
      .single();

    if (!sessionError && session) {
      setSessionId(session.id);
    }

    setGameState("playing");
  }

  function selectQuestion(categoryIndex: number, pointIndex: number) {
    const question = board[categoryIndex][pointIndex];
    if (!question) return;

    setCurrentQuestion(question);
    setStudentAnswer("");
    setGameState("question");
  }

  async function submitAnswer() {
    if (!currentQuestion || !sessionId) return;

    const isCorrect = studentAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
    const pointsEarned = isCorrect ? currentQuestion.point_value : 0;

    setScore(score + pointsEarned);
    setQuestionsAnswered(questionsAnswered + 1);
    if (isCorrect) setQuestionsCorrect(questionsCorrect + 1);

    // Save answer to database
    await supabase.from("jeopardy_answers").insert({
      session_id: sessionId,
      question_id: currentQuestion.id,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });

    // Update session score
    await supabase
      .from("jeopardy_sessions")
      .update({
        total_score: score + pointsEarned,
        questions_answered: questionsAnswered + 1,
        questions_correct: questionsCorrect + (isCorrect ? 1 : 0),
      })
      .eq("id", sessionId);

    // Mark question as answered on board
    const newBoard = [...board];
    const categoryIndex = selectedCategories.indexOf(currentQuestion.category);
    const pointIndex = pointValues.indexOf(currentQuestion.point_value);
    newBoard[categoryIndex][pointIndex] = null;
    setBoard(newBoard);

    setGameState("answer");
  }

  function continueGame() {
    // Check if game is finished
    const remainingQuestions = board.flat().filter((q) => q !== null).length;
    if (remainingQuestions === 0) {
      finishGame();
    } else {
      setGameState("playing");
      setCurrentQuestion(null);
    }
  }

  async function finishGame() {
    if (sessionId) {
      await supabase
        .from("jeopardy_sessions")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    setGameState("finished");
  }

  // Setup screen
  if (gameState === "setup") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Medical Jeopardy</h2>
            <p className="mt-2 text-sm text-zinc-400">Select 5 categories to start your game</p>
          </div>
          <button
            onClick={onExit}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            ← Back
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-200">
            Select Categories ({selectedCategories.length}/5)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  if (selectedCategories.includes(category)) {
                    setSelectedCategories(selectedCategories.filter((c) => c !== category));
                  } else if (selectedCategories.length < 5) {
                    setSelectedCategories([...selectedCategories, category]);
                  }
                }}
                className={`rounded-lg border p-4 text-left transition ${
                  selectedCategories.includes(category)
                    ? "border-blue-600 bg-blue-950/50 text-blue-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800"
                }`}
              >
                <div className="font-medium">{category}</div>
                {selectedCategories.includes(category) && (
                  <div className="mt-1 text-xs text-blue-400">
                    ✓ Position #{selectedCategories.indexOf(category) + 1}
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedCategories.length === 5 && (
            <button
              onClick={startGame}
              className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Start Game →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Playing screen - Jeopardy board
  if (gameState === "playing") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Medical Jeopardy</h2>
            <div className="mt-2 flex items-center gap-6 text-sm text-zinc-400">
              <span>Score: <span className="font-semibold text-blue-400">${score}</span></span>
              <span>Questions: {questionsAnswered}/25</span>
              <span>Correct: {questionsCorrect}/{questionsAnswered || 1} ({questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : 0}%)</span>
            </div>
          </div>
          <button
            onClick={finishGame}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            End Game
          </button>
        </div>

        {/* Jeopardy Board */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="min-w-[800px]">
            {/* Category Headers */}
            <div className="mb-4 grid grid-cols-5 gap-2">
              {selectedCategories.map((category, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-blue-900/50 p-4 text-center font-bold text-blue-200"
                >
                  {category}
                </div>
              ))}
            </div>

            {/* Point Value Rows */}
            {pointValues.map((pointValue, pointIdx) => (
              <div key={pointValue} className="mb-2 grid grid-cols-5 gap-2">
                {selectedCategories.map((category, categoryIdx) => {
                  const question = board[categoryIdx][pointIdx];
                  return (
                    <button
                      key={`${categoryIdx}-${pointIdx}`}
                      onClick={() => question && selectQuestion(categoryIdx, pointIdx)}
                      disabled={!question}
                      className={`rounded-lg p-6 text-center text-2xl font-bold transition ${
                        question
                          ? "cursor-pointer bg-blue-700 text-yellow-400 hover:bg-blue-600"
                          : "cursor-not-allowed bg-zinc-800/50 text-zinc-700"
                      }`}
                    >
                      {question ? `$${pointValue}` : "—"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  if (gameState === "question" && currentQuestion) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <div className="text-sm font-medium text-zinc-400">{currentQuestion.category}</div>
            <div className="text-2xl font-bold text-yellow-400">${currentQuestion.point_value}</div>
          </div>
          <div className="text-sm text-zinc-400">
            Score: <span className="font-semibold text-blue-400">${score}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <div className="mb-8 text-center text-xl font-medium leading-relaxed text-zinc-200">
            {currentQuestion.question}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Your Answer</label>
              <input
                type="text"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                placeholder="Type your answer..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                autoFocus
              />
            </div>

            <button
              onClick={submitAnswer}
              disabled={!studentAnswer.trim()}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Answer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Answer screen
  if (gameState === "answer" && currentQuestion) {
    const isCorrect = studentAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <div className="text-sm font-medium text-zinc-400">{currentQuestion.category}</div>
            <div className="text-2xl font-bold text-yellow-400">${currentQuestion.point_value}</div>
          </div>
          <div className="text-sm text-zinc-400">
            Score: <span className="font-semibold text-blue-400">${score}</span>
          </div>
        </div>

        <div className={`rounded-2xl border p-8 ${isCorrect ? "border-green-700 bg-green-950/30" : "border-red-700 bg-red-950/30"}`}>
          <div className="mb-6 text-center">
            <div className={`text-6xl font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
              {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </div>
            {isCorrect && (
              <div className="mt-2 text-2xl font-semibold text-green-300">
                +${currentQuestion.point_value}
              </div>
            )}
          </div>

          <div className="space-y-4 text-center">
            <div>
              <div className="text-sm font-medium text-zinc-400">Question</div>
              <div className="mt-1 text-lg text-zinc-200">{currentQuestion.question}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-zinc-400">Your Answer</div>
              <div className={`mt-1 text-lg ${isCorrect ? "text-green-300" : "text-red-300"}`}>
                {studentAnswer}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-zinc-400">Correct Answer</div>
              <div className="mt-1 text-lg font-semibold text-blue-300">{currentQuestion.answer}</div>
            </div>

            {currentQuestion.explanation && (
              <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 text-left">
                <div className="mb-2 text-sm font-medium text-zinc-400">Explanation</div>
                <div className="text-sm leading-relaxed text-zinc-300">
                  {currentQuestion.explanation}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={continueGame}
            className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
  if (gameState === "finished") {
    const percentage = questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="mb-6 text-6xl font-bold text-yellow-400">Game Over!</div>

          <div className="mb-8 text-4xl font-bold text-blue-400">Final Score: ${score}</div>

          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-2xl font-bold text-zinc-100">{questionsAnswered}</div>
              <div className="text-sm text-zinc-400">Questions</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-2xl font-bold text-green-400">{questionsCorrect}</div>
              <div className="text-sm text-zinc-400">Correct</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-2xl font-bold text-blue-400">{percentage}%</div>
              <div className="text-sm text-zinc-400">Accuracy</div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => {
                setGameState("setup");
                setSelectedCategories([]);
                setBoard([]);
                setScore(0);
                setQuestionsAnswered(0);
                setQuestionsCorrect(0);
                setSessionId(null);
              }}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Play Again
            </button>
            <button
              onClick={onExit}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-700"
            >
              Back to Learning Tools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
