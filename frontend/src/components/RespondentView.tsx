"use client";

import { useEffect, useState, useCallback } from "react";
import { PublicQuestion } from "@/lib/types";

export interface RespondentViewProps {
  formTitle: string;
  questions: PublicQuestion[];
  isPreview?: boolean;
  onSubmit?: (answers: Record<number, unknown>) => Promise<void>;
  onClosePreview?: () => void;
}

export function RespondentView({
  formTitle,
  questions,
  isPreview = false,
  onSubmit,
  onClosePreview,
}: RespondentViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalQuestions = questions.length;
  const currentQ: PublicQuestion | undefined = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentVal = currentQ ? answers[currentQ.id] : undefined;

  const handleValueChange = (val: unknown) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
    setErrorMessage(null);
  };

  const validateCurrent = useCallback((): boolean => {
    if (!currentQ) return true;

    if (currentQ.required) {
      if (currentVal === undefined || currentVal === null || currentVal === "") {
        setErrorMessage("Please answer this question to proceed.");
        return false;
      }
      if (typeof currentVal === "string" && !currentVal.trim()) {
        setErrorMessage("This field cannot be empty.");
        return false;
      }
    }

    if (currentVal !== undefined && currentVal !== null && currentVal !== "") {
      if (currentQ.type === "email" && typeof currentVal === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(currentVal.trim())) {
          setErrorMessage("Please enter a valid email address.");
          return false;
        }
      }
    }

    setErrorMessage(null);
    return true;
  }, [currentQ, currentVal]);

  const handleNext = useCallback(async () => {
    if (!validateCurrent()) return;

    if (isLastQuestion) {
      if (isPreview) {
        setSubmitted(true);
      } else if (onSubmit) {
        try {
          setSubmitting(true);
          await onSubmit(answers);
          setSubmitted(true);
        } catch (err: unknown) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to submit response");
        } finally {
          setSubmitting(false);
        }
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [validateCurrent, isLastQuestion, isPreview, onSubmit, answers]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setErrorMessage(null);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (submitted || !currentQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      // When NOT typing inside an editable field, allow arrow keys and shortcuts
      if (!isInput) {
        // Arrow key navigation
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          handleNext();
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          handlePrev();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleNext();
          return;
        }

        // Multiple choice keyboard letters A, B, C, D...
        if (currentQ.type === "multiple_choice") {
          const char = e.key.toUpperCase();
          if (char >= "A" && char <= "Z") {
            const index = char.charCodeAt(0) - 65;
            const options = currentQ.settings?.options || [];
            if (index < options.length) {
              e.preventDefault();
              handleValueChange(options[index]);
            }
          }
        } else if (currentQ.type === "yes_no") {
          const char = e.key.toUpperCase();
          if (char === "Y") {
            e.preventDefault();
            handleValueChange(true);
          } else if (char === "N") {
            e.preventDefault();
            handleValueChange(false);
          }
        } else if (currentQ.type === "rating") {
          const num = parseInt(e.key, 10);
          const minR = currentQ.settings?.min_rating || 1;
          const maxR = currentQ.settings?.max_rating || 5;
          if (!isNaN(num) && num >= minR && num <= maxR) {
            e.preventDefault();
            handleValueChange(num);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentQ, answers, isLastQuestion, submitted, handleNext, handlePrev]);

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 text-white">
          <h1 className="text-xl font-bold mb-2">Form is Empty</h1>
          <p className="text-slate-400 text-sm">No questions have been configured for this form.</p>
          {isPreview && onClosePreview && (
            <button
              onClick={onClosePreview}
              className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
            >
              Exit Preview
            </button>
          )}
        </div>
      </div>
    );
  }

  // Completion / Thank You Screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-10 text-white shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 border border-emerald-500/30">
            ✓
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight">
            {isPreview ? "Preview Complete!" : "Thank You!"}
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {isPreview
              ? "This is how respondents will see the submission confirmation screen."
              : "Your response has been recorded successfully."}
          </p>

          {isPreview ? (
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setCurrentIndex(0);
                  setAnswers({});
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition"
              >
                ↺ Restart Preview
              </button>
              {onClosePreview && (
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  Exit Preview
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-4">
              Typeform Clone &bull; Powered by Scalar AI
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* TOP PROGRESS BAR */}
      <div className="w-full bg-slate-800 h-1.5">
        <div
          className="bg-blue-500 h-1.5 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* QUESTION CONTAINER */}
      <main className="flex-1 flex flex-col justify-center max-w-2xl w-full mx-auto px-6 py-12">
        <div className="mb-2 flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-widest">
          <span>
            {currentIndex + 1} of {totalQuestions}
          </span>
          {currentQ.required && (
            <span className="text-red-400">* Required</span>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-snug">
          {currentQ.title}
        </h2>

        {currentQ.description && (
          <p className="text-sm text-slate-400 mb-6">{currentQ.description}</p>
        )}

        {/* INPUT WIDGETS BY QUESTION TYPE */}
        <div className="my-6">
          {/* SHORT TEXT */}
          {currentQ.type === "short_text" && (
            <div>
              <input
                type="text"
                autoFocus
                placeholder="Type your answer here..."
                value={(currentVal as string) || ""}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-blue-400 pb-2 text-xl sm:text-2xl text-white placeholder-slate-600 focus:outline-none transition"
              />
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                  Enter ↵
                </kbd>
              </div>
            </div>
          )}

          {/* LONG TEXT */}
          {currentQ.type === "long_text" && (
            <div>
              <textarea
                rows={4}
                autoFocus
                placeholder="Type your response here..."
                value={(currentVal as string) || ""}
                onChange={(e) => handleValueChange(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-400 p-4 rounded-xl text-lg text-white placeholder-slate-600 focus:outline-none transition resize-none"
              />
            </div>
          )}

          {/* EMAIL */}
          {currentQ.type === "email" && (
            <div>
              <input
                type="email"
                autoFocus
                placeholder="name@example.com"
                value={(currentVal as string) || ""}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-blue-400 pb-2 text-xl sm:text-2xl text-white placeholder-slate-600 focus:outline-none transition"
              />
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                  Enter ↵
                </kbd>
              </div>
            </div>
          )}

          {/* NUMBER */}
          {currentQ.type === "number" && (
            <div>
              <input
                type="number"
                autoFocus
                placeholder="0"
                min={currentQ.settings?.min}
                max={currentQ.settings?.max}
                value={currentVal !== undefined && currentVal !== null ? (currentVal as number) : ""}
                onChange={(e) =>
                  handleValueChange(
                    e.target.value === "" ? "" : parseFloat(e.target.value)
                  )
                }
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-blue-400 pb-2 text-2xl text-white placeholder-slate-600 focus:outline-none transition font-mono max-w-xs"
              />
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                  Enter ↵
                </kbd>
              </div>
            </div>
          )}

          {/* MULTIPLE CHOICE */}
          {currentQ.type === "multiple_choice" && (
            <div className="space-y-3">
              {(currentQ.settings?.options || []).map((opt: string, optIdx: number) => {
                const isSelected = currentVal === opt;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleValueChange(opt)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center space-x-3 transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-400 text-white shadow-lg shadow-blue-500/10"
                        : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-blue-500 text-white border-blue-400"
                          : "bg-slate-700/50 text-slate-300 border-slate-600"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-base font-medium">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* DROPDOWN */}
          {currentQ.type === "dropdown" && (
            <div>
              <select
                autoFocus
                value={(currentVal as string) || ""}
                onChange={(e) => handleValueChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-400 p-4 rounded-xl text-lg text-white focus:outline-none transition cursor-pointer"
              >
                <option value="">Select an option...</option>
                {(currentQ.settings?.options || []).map((opt: string, optIdx: number) => (
                  <option key={optIdx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* YES / NO */}
          {currentQ.type === "yes_no" && (
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <button
                type="button"
                onClick={() => handleValueChange(true)}
                className={`p-6 rounded-2xl border text-center font-bold text-xl transition cursor-pointer ${
                  currentVal === true
                    ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20"
                    : "bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-200"
                }`}
              >
                <span className="block text-2xl mb-1">👍</span>
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => handleValueChange(false)}
                className={`p-6 rounded-2xl border text-center font-bold text-xl transition cursor-pointer ${
                  currentVal === false
                    ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20"
                    : "bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-200"
                }`}
              >
                <span className="block text-2xl mb-1">👎</span>
                <span>No</span>
              </button>
            </div>
          )}

          {/* RATING */}
          {currentQ.type === "rating" && (
            <div>
              <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-2">
                {Array.from(
                  {
                    length:
                      (currentQ.settings?.max_rating || 5) -
                      (currentQ.settings?.min_rating || 1) +
                      1,
                  },
                  (_, i) => (currentQ.settings?.min_rating || 1) + i
                ).map((r) => {
                  const isSelected = currentVal === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleValueChange(r)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border font-bold text-lg transition cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20 scale-105"
                          : "bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div className="p-3 bg-red-900/40 border border-red-500/40 text-red-200 text-sm rounded-xl mb-4">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* NAVIGATION CONTROLS */}
        <div className="flex items-center space-x-4 pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span>Submitting...</span>
            ) : isLastQuestion ? (
              <span>Submit Form</span>
            ) : (
              <span>OK</span>
            )}
          </button>

          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-xl transition cursor-pointer"
            >
              ← Back
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 pl-2">
            <span>Navigate with</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono text-[11px]">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono text-[11px]">
              ↓
            </kbd>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-2xl w-full mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-600">
        <div>{formTitle}</div>
        <div className="font-medium text-slate-500">
          {isPreview ? "Live Preview" : "Powered by Typeform Clone"}
        </div>
      </footer>
    </div>
  );
}
