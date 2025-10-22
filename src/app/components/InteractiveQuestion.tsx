"use client";

import { useState } from "react";
import {
  MultipleChoiceQuestion,
  FillInBlankQuestion,
  MatchingQuestion,
  DiagramQuestion,
  InteractiveQuestion as IQuestion,
} from "@/types/interactiveCoach";

interface InteractiveQuestionProps {
  question: IQuestion;
  onSubmit: (isCorrect: boolean, userAnswer: any, timeSeconds: number) => void;
  showFeedback?: boolean;
}

export default function InteractiveQuestion({
  question,
  onSubmit,
  showFeedback = true,
}: InteractiveQuestionProps) {
  const [startTime] = useState(Date.now());

  switch (question.type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceRenderer
          question={question.data}
          onSubmit={onSubmit}
          showFeedback={showFeedback}
          startTime={startTime}
        />
      );
    case 'fill_blank':
      return (
        <FillBlankRenderer
          question={question.data}
          onSubmit={onSubmit}
          showFeedback={showFeedback}
          startTime={startTime}
        />
      );
    case 'matching':
      return (
        <MatchingRenderer
          question={question.data}
          onSubmit={onSubmit}
          showFeedback={showFeedback}
          startTime={startTime}
        />
      );
    case 'diagram':
      return (
        <DiagramRenderer
          question={question.data}
          onSubmit={onSubmit}
          showFeedback={showFeedback}
          startTime={startTime}
        />
      );
    default:
      return <div>Unknown question type</div>;
  }
}

// ============================================================================
// Multiple Choice Renderer
// ============================================================================

function MultipleChoiceRenderer({
  question,
  onSubmit,
  showFeedback,
  startTime,
}: {
  question: MultipleChoiceQuestion;
  onSubmit: (isCorrect: boolean, userAnswer: any, timeSeconds: number) => void;
  showFeedback: boolean;
  startTime: number;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  function handleSubmit() {
    if (!selectedOption) return;

    const correct = question.options.find(o => o.id === selectedOption)?.isCorrect || false;
    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);

    setIsCorrect(correct);
    setSubmitted(true);
    onSubmit(correct, { selectedOptionId: selectedOption }, timeSeconds);
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-medium text-zinc-200 mb-4">{question.question}</h3>

        {/* Media (if present) */}
        {question.media_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={question.media_url}
              alt="Question media"
              className="w-full max-h-96 object-contain bg-zinc-800"
            />
          </div>
        )}

        {/* Options */}
        <div className="space-y-2">
          {question.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const showCorrectness = submitted && showFeedback;
            const optionIsCorrect = option.isCorrect;

            let borderColor = 'border-zinc-700';
            let bgColor = 'bg-zinc-900';

            if (showCorrectness) {
              if (isSelected && isCorrect) {
                borderColor = 'border-green-600';
                bgColor = 'bg-green-900/20';
              } else if (isSelected && !isCorrect) {
                borderColor = 'border-red-600';
                bgColor = 'bg-red-900/20';
              } else if (optionIsCorrect) {
                borderColor = 'border-green-600';
                bgColor = 'bg-green-900/10';
              }
            } else if (isSelected) {
              borderColor = 'border-emerald-600';
              bgColor = 'bg-emerald-900/20';
            }

            return (
              <button
                key={option.id}
                onClick={() => !submitted && setSelectedOption(option.id)}
                disabled={submitted}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${borderColor} ${bgColor} ${
                  submitted ? 'cursor-default' : 'hover:border-emerald-500 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-zinc-200">{option.text}</span>
                  {showCorrectness && optionIsCorrect && (
                    <span className="ml-auto text-green-400">✓ Correct</span>
                  )}
                  {showCorrectness && isSelected && !isCorrect && (
                    <span className="ml-auto text-red-400">✗ Incorrect</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Submit Answer
          </button>
        )}

        {/* Explanation */}
        {submitted && showFeedback && (
          <div className={`mt-6 p-4 rounded-lg border-2 ${
            isCorrect
              ? 'border-green-700 bg-green-900/20'
              : 'border-red-700 bg-red-900/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{isCorrect ? '✓' : '✗'}</span>
              <span className={`font-semibold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            <p className="text-zinc-300 text-sm">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Fill in the Blank Renderer
// ============================================================================

function FillBlankRenderer({
  question,
  onSubmit,
  showFeedback,
  startTime,
}: {
  question: FillInBlankQuestion;
  onSubmit: (isCorrect: boolean, userAnswer: any, timeSeconds: number) => void;
  showFeedback: boolean;
  startTime: number;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [correctness, setCorrectness] = useState<Record<number, boolean>>({});

  function handleSubmit() {
    const results: Record<number, boolean> = {};
    let allCorrect = true;

    question.blanks.forEach((blank) => {
      const userAnswer = (answers[blank.position] || '').trim();
      const isCorrect = blank.correctAnswers.some(correct =>
        blank.caseSensitive
          ? correct === userAnswer
          : correct.toLowerCase() === userAnswer.toLowerCase()
      );

      results[blank.position] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);

    setCorrectness(results);
    setSubmitted(true);
    onSubmit(allCorrect, answers, timeSeconds);
  }

  // Split question text by blanks
  const parts = question.question.split(/\[BLANK\]/g);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-medium text-zinc-200 mb-4">Fill in the Blanks</h3>

        {/* Question with inline inputs */}
        <div className="text-zinc-200 leading-relaxed">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < question.blanks.length && (
                <input
                  type="text"
                  value={answers[question.blanks[i].position] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.blanks[i].position]: e.target.value })}
                  disabled={submitted}
                  className={`inline-block mx-1 px-3 py-1 border-2 rounded bg-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500 min-w-[120px] ${
                    submitted && showFeedback
                      ? correctness[question.blanks[i].position]
                        ? 'border-green-600 bg-green-900/20'
                        : 'border-red-600 bg-red-900/20'
                      : 'border-zinc-700'
                  }`}
                  placeholder={submitted ? '' : `Blank ${i + 1}`}
                />
              )}
            </span>
          ))}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== question.blanks.length}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Submit Answers
          </button>
        )}

        {/* Feedback */}
        {submitted && showFeedback && (
          <div className="mt-6 space-y-3">
            {question.blanks.map((blank, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  correctness[blank.position]
                    ? 'border-green-700 bg-green-900/20'
                    : 'border-red-700 bg-red-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Blank {i + 1}:</span>
                  <span className={correctness[blank.position] ? 'text-green-300' : 'text-red-300'}>
                    {correctness[blank.position] ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
                {!correctness[blank.position] && (
                  <div className="mt-2 text-sm text-zinc-400">
                    Correct answer(s): {blank.correctAnswers.join(', ')}
                  </div>
                )}
              </div>
            ))}

            <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/40">
              <p className="text-zinc-300 text-sm">{question.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Matching Renderer
// ============================================================================

function MatchingRenderer({
  question,
  onSubmit,
  showFeedback,
  startTime,
}: {
  question: MatchingQuestion;
  onSubmit: (isCorrect: boolean, userAnswer: any, timeSeconds: number) => void;
  showFeedback: boolean;
  startTime: number;
}) {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [correctness, setCorrectness] = useState<Record<string, boolean>>({});

  function handleMatch(leftId: string, rightId: string) {
    setMatches({ ...matches, [leftId]: rightId });
  }

  function handleSubmit() {
    const results: Record<string, boolean> = {};
    let allCorrect = true;

    Object.entries(question.correctMatches).forEach(([leftId, correctRightId]) => {
      const isCorrect = matches[leftId] === correctRightId;
      results[leftId] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);

    setCorrectness(results);
    setSubmitted(true);
    onSubmit(allCorrect, matches, timeSeconds);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-medium text-zinc-200 mb-4">{question.question}</h3>
        <p className="text-sm text-zinc-400 mb-6">Match items from the left column to the right column</p>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            {question.leftColumn.map((item) => {
              const matched = matches[item.id];
              const showCorrectness = submitted && showFeedback;
              const isCorrect = correctness[item.id];

              let borderColor = 'border-zinc-700';
              if (showCorrectness) {
                borderColor = isCorrect ? 'border-green-600' : 'border-red-600';
              } else if (matched) {
                borderColor = 'border-emerald-600';
              }

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 ${borderColor} bg-zinc-900/60`}
                >
                  <div className="text-zinc-200 mb-2">{item.text}</div>
                  {matched && (
                    <div className="text-sm text-emerald-400">
                      → {question.rightColumn.find(r => r.id === matched)?.text}
                    </div>
                  )}
                  {showCorrectness && (
                    <div className={`text-sm mt-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {isCorrect ? '✓ Correct' : `✗ Should match: ${question.rightColumn.find(r => r.id === question.correctMatches[item.id])?.text}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {question.rightColumn.map((item) => {
              const isMatched = Object.values(matches).includes(item.id);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (submitted) return;
                    // Find which left item to match
                    const unmatchedLeft = question.leftColumn.find(l => !matches[l.id]);
                    if (unmatchedLeft) {
                      handleMatch(unmatchedLeft.id, item.id);
                    }
                  }}
                  disabled={submitted || isMatched}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    isMatched
                      ? 'border-zinc-800 bg-zinc-900/20 opacity-50'
                      : 'border-zinc-700 bg-zinc-900/60 hover:border-emerald-500 cursor-pointer'
                  }`}
                >
                  {item.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear/Reset */}
        {!submitted && Object.keys(matches).length > 0 && (
          <button
            onClick={() => setMatches({})}
            className="mt-4 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Clear all matches
          </button>
        )}

        {/* Submit Button */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(matches).length !== question.leftColumn.length}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Submit Matches
          </button>
        )}

        {/* Explanation */}
        {submitted && showFeedback && (
          <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-800/40">
            <p className="text-zinc-300 text-sm">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Diagram Labeling Renderer
// ============================================================================

function DiagramRenderer({
  question,
  onSubmit,
  showFeedback,
  startTime,
}: {
  question: DiagramQuestion;
  onSubmit: (isCorrect: boolean, userAnswer: any, timeSeconds: number) => void;
  showFeedback: boolean;
  startTime: number;
}) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [correctness, setCorrectness] = useState<Record<string, boolean>>({});

  function handleSubmit() {
    const results: Record<string, boolean> = {};
    let allCorrect = true;

    question.labelPoints.forEach((point) => {
      const userLabel = (labels[point.id] || '').trim();
      const isCorrect = userLabel.toLowerCase() === point.correctLabel.toLowerCase();

      results[point.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);

    setCorrectness(results);
    setSubmitted(true);
    onSubmit(allCorrect, labels, timeSeconds);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-medium text-zinc-200 mb-4">{question.question}</h3>
        <p className="text-sm text-zinc-400 mb-6">Click the numbered points to label them</p>

        {/* Diagram with overlay */}
        <div className="relative inline-block">
          <img
            src={question.diagram_url}
            alt="Diagram to label"
            className="max-w-full h-auto rounded-lg"
          />

          {/* Label points */}
          {question.labelPoints.map((point, i) => {
            const showCorrectness = submitted && showFeedback;
            const isCorrect = correctness[point.id];

            return (
              <div
                key={point.id}
                style={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                    showCorrectness
                      ? isCorrect
                        ? 'bg-green-600 border-green-400 text-white'
                        : 'bg-red-600 border-red-400 text-white'
                      : labels[point.id]
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-zinc-800 border-zinc-600 text-zinc-300'
                  }`}
                >
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Label inputs */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.labelPoints.map((point, i) => (
            <div key={point.id}>
              <label className="block text-sm text-zinc-400 mb-1">Point {i + 1}</label>
              <input
                type="text"
                value={labels[point.id] || ''}
                onChange={(e) => setLabels({ ...labels, [point.id]: e.target.value })}
                disabled={submitted}
                placeholder="Enter label"
                className={`w-full px-3 py-2 border-2 rounded bg-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500 ${
                  submitted && showFeedback
                    ? correctness[point.id]
                      ? 'border-green-600 bg-green-900/20'
                      : 'border-red-600 bg-red-900/20'
                    : 'border-zinc-700'
                }`}
              />
              {submitted && showFeedback && !correctness[point.id] && (
                <div className="mt-1 text-xs text-red-400">
                  Correct: {point.correctLabel}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(labels).length !== question.labelPoints.length}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition"
          >
            Submit Labels
          </button>
        )}

        {/* Explanation */}
        {submitted && showFeedback && (
          <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-800/40">
            <p className="text-zinc-300 text-sm">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
