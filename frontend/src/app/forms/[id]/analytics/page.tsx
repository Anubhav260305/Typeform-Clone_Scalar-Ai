"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { getAnalytics, getForm } from "@/lib/api";
import { AnalyticsQuestion, AnalyticsResponse, Form, QuestionType } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FormAnalyticsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const formId = parseInt(resolvedParams.id, 10);

  const [form, setForm] = useState<Form | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [formData, analyticsData] = await Promise.all([
        getForm(formId),
        getAnalytics(formId),
      ]);
      setForm(formData);
      setAnalytics(analyticsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [formId]);

  const getBadgeColor = (type: QuestionType) => {
    switch (type) {
      case "short_text":
      case "long_text":
        return "bg-slate-100 text-slate-700";
      case "multiple_choice":
      case "dropdown":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "email":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "number":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "yes_no":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "rating":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const renderQuestionAnalytics = (q: AnalyticsQuestion, totalFormResponses: number) => {
    const qCount = q.response_count;
    const answerRate =
      totalFormResponses > 0
        ? Math.round((qCount / totalFormResponses) * 100)
        : 0;

    switch (q.question_type) {
      case "rating": {
        const dist = q.distribution || {};
        const avg = q.average !== null && q.average !== undefined ? q.average : null;
        // Rating scale typically 1 to 5
        const ratingLevels = ["5", "4", "3", "2", "1"];

        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
              <div className="text-3xl font-black text-amber-800">
                {avg !== null ? avg.toFixed(1) : "—"}
              </div>
              <div>
                <div className="flex text-amber-500 text-lg">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        avg !== null && star <= Math.round(avg)
                          ? "text-amber-500"
                          : "text-slate-200"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  Average Rating out of 5 ({qCount} responses)
                </p>
              </div>
            </div>

            {/* Distribution bars */}
            <div className="space-y-2 pt-2">
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rating Distribution
              </h5>
              {ratingLevels.map((lvl) => {
                const count = dist[lvl] || 0;
                const pct = qCount > 0 ? Math.round((count / qCount) * 100) : 0;
                return (
                  <div key={lvl} className="flex items-center space-x-3 text-xs">
                    <span className="w-10 font-bold text-slate-700 flex items-center space-x-1">
                      <span>{lvl}</span>
                      <span className="text-amber-500">★</span>
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-medium text-slate-600">
                      {pct}% <span className="text-slate-400">({count})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "number": {
        const avg = q.average !== null && q.average !== undefined ? q.average : null;
        const min = q.minimum !== null && q.minimum !== undefined ? q.minimum : null;
        const max = q.maximum !== null && q.maximum !== undefined ? q.maximum : null;

        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-violet-50/70 border border-violet-100 rounded-xl p-4 text-center">
              <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider block mb-1">
                Average
              </span>
              <span className="text-2xl font-black text-violet-900">
                {avg !== null ? (avg % 1 === 0 ? avg : avg.toFixed(2)) : "—"}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Minimum
              </span>
              <span className="text-2xl font-black text-slate-800">
                {min !== null ? (min % 1 === 0 ? min : min.toFixed(2)) : "—"}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Maximum
              </span>
              <span className="text-2xl font-black text-slate-800">
                {max !== null ? (max % 1 === 0 ? max : max.toFixed(2)) : "—"}
              </span>
            </div>
          </div>
        );
      }

      case "yes_no": {
        const dist = q.distribution || {};
        const yesCount = dist["true"] ?? dist["True"] ?? dist["yes"] ?? 0;
        const noCount = dist["false"] ?? dist["False"] ?? dist["no"] ?? 0;
        const yesPct = qCount > 0 ? Math.round((yesCount / qCount) * 100) : 0;
        const noPct = qCount > 0 ? 100 - yesPct : 0;

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-800">Yes</span>
                  <span className="text-xs font-bold text-emerald-700">{yesPct}%</span>
                </div>
                <div className="text-xl font-black text-emerald-900">{yesCount}</div>
              </div>
              <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-rose-800">No</span>
                  <span className="text-xs font-bold text-rose-700">{noPct}%</span>
                </div>
                <div className="text-xl font-black text-rose-900">{noCount}</div>
              </div>
            </div>

            {/* Split bar */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 flex overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${yesPct}%` }}
                title={`Yes: ${yesPct}%`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${noPct}%` }}
                title={`No: ${noPct}%`}
              />
            </div>
          </div>
        );
      }

      case "multiple_choice":
      case "dropdown": {
        const dist = q.distribution || {};
        const entries = Object.entries(dist);

        if (entries.length === 0) {
          return (
            <p className="text-xs text-slate-400 italic">No option choices recorded yet.</p>
          );
        }

        return (
          <div className="space-y-3 pt-1">
            {entries.map(([option, count]) => {
              const pct = qCount > 0 ? Math.round((count / qCount) * 100) : 0;
              return (
                <div key={option} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{option}</span>
                    <span className="font-medium text-slate-600">
                      {pct}% <span className="text-slate-400">({count})</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case "short_text":
      case "long_text":
      case "email": {
        return (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">
                Text and qualitative responses are gathered in detail.
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                {qCount} {qCount === 1 ? "answer" : "answers"} collected ({answerRate}% completion)
              </p>
            </div>
            <Link
              href={`/forms/${formId}/responses`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition"
            >
              Browse in Responses →
            </Link>
          </div>
        );
      }

      default:
        return (
          <p className="text-xs text-slate-500">
            {qCount} responses collected for this question.
          </p>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        formTitle={form?.title}
        formId={formId}
        currentTab="analytics"
        status={form?.status}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
            <p className="text-slate-500 text-sm">Calculating form analytics...</p>
          </div>
        ) : error ? (
          <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-lg mx-auto">
            <p className="text-red-700 font-medium mb-3">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition"
            >
              Try Again
            </button>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Analytics & Insights
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Live statistics and answer distributions for this form.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={loadData}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition flex items-center space-x-1.5"
                  title="Refresh statistics"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>

                <Link
                  href={`/forms/${formId}/responses`}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
                >
                  View Responses
                </Link>

                {form?.status === "published" && (
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition inline-flex items-center space-x-1.5"
                  >
                    <span>Open Form</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Overview KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Total Submissions
                </span>
                <div className="text-3xl font-black text-slate-900">
                  {analytics.total_responses}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Completed response records
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Total Questions
                </span>
                <div className="text-3xl font-black text-slate-900">
                  {analytics.questions.length}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Active questions in this form
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Form Status
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-bold uppercase tracking-wider ${
                      form?.status === "published"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {form?.status || "draft"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {form?.status === "published"
                    ? "Accepting public submissions"
                    : "Published forms collect live data"}
                </p>
              </div>
            </div>

            {/* Zero State if 0 responses */}
            {analytics.total_responses === 0 ? (
              <div className="my-12 text-center max-w-lg mx-auto p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-2xl font-bold mb-4">
                  📊
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No analytics yet</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {form?.status === "published"
                    ? "Your form is published! As respondents fill out your form, summary stats and distribution charts will automatically update here."
                    : "Publish your form to share it with respondents and start gathering response data."}
                </p>
                {form?.status === "published" ? (
                  <a
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                  >
                    Submit a Sample Response →
                  </a>
                ) : (
                  <Link
                    href={`/forms/${formId}/edit`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                  >
                    Go to Builder & Publish
                  </Link>
                )}
              </div>
            ) : (
              /* Question Breakdown Cards */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    Question Breakdown
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing statistics for {analytics.questions.length} questions
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analytics.questions.map((q, idx) => (
                    <div
                      key={q.question_id}
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
                    >
                      {/* Question Header */}
                      <div className="mb-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getBadgeColor(
                                q.question_type
                              )}`}
                            >
                              {q.question_type.replace("_", " ")}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            {q.response_count} / {analytics.total_responses} answered
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">
                          {q.question_title}
                        </h3>
                      </div>

                      {/* Question Analytics Body */}
                      <div className="pt-2 border-t border-slate-100">
                        {renderQuestionAnalytics(q, analytics.total_responses)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
