"use client";

import { useEffect, useState, use } from "react";
import { getPublicForm, submitResponse } from "@/lib/api";
import { PublicForm, PublicQuestion } from "@/lib/types";

export default function PublicRespondentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Respondent session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        const data = await getPublicForm(slug);
        setForm(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-white mb-4"></div>
          <p className="text-slate-400 text-sm">Loading form...</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Form Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">
            This form does not exist or has not been published by the creator yet.
          </p>
        </div>
      </div>
    );
  }

  if (form.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 text-white">
          <h1 className="text-xl font-bold mb-2">Form is Empty</h1>
          <p className="text-slate-400 text-sm">No questions have been configured for this form.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-10 text-white shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 border border-emerald-500/30">
            ✓
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight">Thank You!</h1>
          <p className="text-slate-400 text-sm mb-6">
            Your response has been recorded successfully.
          </p>
          <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-4">
            Typeform Clone &bull; Powered by Scalar AI
          </div>
        </div>
      </div>
    );
  }

  const currentQ: PublicQuestion = form.questions[currentIndex];
  const totalQuestions = form.questions.length;
  const currentVal = answers[currentQ.id];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleValueChange = (val: unknown) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
    setErrorMessage(null);
  };

  const validateCurrent = (): boolean => {
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
  };

  const handleNext = async () => {
    if (!validateCurrent()) return;

    if (isLastQuestion) {
      await handleFinalSubmit();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setErrorMessage(null);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const formattedAnswers = Object.entries(answers)
        .filter(([, val]) => val !== undefined && val !== null && val !== "")
        .map(([qId, val]) => ({
          question_id: parseInt(qId, 10),
          value: val,
        }));

      await submitResponse(form.id, { answers: formattedAnswers });
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

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
              {(currentQ.settings?.options || []).map((opt, optIdx) => {
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
                {(currentQ.settings?.options || []).map((opt, optIdx) => (
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
              <span>Submit Form ✓</span>
            ) : (
              <span>OK ✓</span>
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
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-2xl w-full mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-600">
        <div>{form.title}</div>
        <div>Typeform Clone</div>
      </footer>
    </div>
  );
}
