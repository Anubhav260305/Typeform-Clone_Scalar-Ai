"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/components/Toast";
import { deleteResponse, getForm, getResponse, getResponses } from "@/lib/api";
import { Form, QuestionType, ResponseDetail, ResponseRead } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FormResponsesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const formId = parseInt(resolvedParams.id, 10);
  const { showToast } = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<ResponseRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected response for modal view
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Action status
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [formData, responsesData] = await Promise.all([
        getForm(formId),
        getResponses(formId),
      ]);
      setForm(formData);
      // Sort responses descending by submission date
      const sorted = [...responsesData].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
      setResponses(sorted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load responses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [formId]);

  const handleViewDetail = async (responseId: number) => {
    setSelectedResponseId(responseId);
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const detail = await getResponse(responseId);
      setSelectedDetail(detail);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Failed to load response details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: number) => {
    if (!confirm(`Are you sure you want to delete Response #${responseId}? This cannot be undone.`)) {
      return;
    }

    try {
      setActionLoadingId(responseId);
      await deleteResponse(responseId);
      setResponses((prev) => prev.filter((r) => r.id !== responseId));
      showToast("Response deleted", "success");
      if (selectedResponseId === responseId) {
        setSelectedResponseId(null);
        setSelectedDetail(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete response");
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyShareLink = () => {
    if (!form) return;
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast("Link copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderAnswerValue = (type: QuestionType, value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-slate-400 italic">No answer provided</span>;
    }

    if (type === "yes_no") {
      const isYes = value === true || value === "true" || value === "yes";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
            isYes
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : "bg-rose-100 text-rose-800 border border-rose-200"
          }`}
        >
          {isYes ? "Yes" : "No"}
        </span>
      );
    }

    if (type === "rating") {
      const num = Number(value);
      return (
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            ★ {num} / 5
          </span>
          <div className="flex text-amber-400 text-sm">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={star <= num ? "text-amber-400" : "text-slate-200"}>
                ★
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === "multiple_choice" || type === "dropdown") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {String(value)}
        </span>
      );
    }

    if (type === "email") {
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-blue-600 hover:text-blue-800 underline text-sm"
        >
          {String(value)}
        </a>
      );
    }

    if (type === "long_text") {
      return (
        <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
          {String(value)}
        </p>
      );
    }

    return <span className="text-sm font-medium text-slate-900">{String(value)}</span>;
  };

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        formTitle={form?.title}
        formId={formId}
        currentTab="responses"
        status={form?.status}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
            <p className="text-slate-500 text-sm">Loading responses...</p>
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
        ) : (
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Form Responses
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {responses.length} {responses.length === 1 ? "response" : "responses"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Browse, review individual submissions, and manage respondent records.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={loadData}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition flex items-center space-x-1.5"
                  title="Refresh responses"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>

                {form?.status === "published" && (
                  <>
                    <button
                      onClick={copyShareLink}
                      className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition flex items-center space-x-1.5"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{copied ? "Link Copied!" : "Copy Link"}</span>
                    </button>
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
                  </>
                )}
              </div>
            </div>

            {/* Zero State */}
            {responses.length === 0 ? (
              <div className="my-12 text-center max-w-lg mx-auto p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-2xl font-bold mb-4">
                  📝
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No responses yet</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {form?.status === "published"
                    ? "Your form is published and ready to collect answers! Share the link with your audience or submit a test response."
                    : "This form is currently in Draft mode. Publish the form to make it accessible to respondents."}
                </p>

                {form?.status === "published" ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={copyShareLink}
                      className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      {copied ? "Copied to Clipboard!" : "Copy Share Link"}
                    </button>
                    <a
                      href={`/f/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition inline-flex items-center justify-center space-x-1.5"
                    >
                      <span>Submit Test Response</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
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
              /* Responses Table */
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">#</th>
                        <th className="px-6 py-3.5">Response ID</th>
                        <th className="px-6 py-3.5">Submission Time</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {responses.map((resp, idx) => (
                        <tr
                          key={resp.id}
                          className="hover:bg-slate-50/80 transition cursor-pointer"
                          onClick={() => handleViewDetail(resp.id)}
                        >
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {responses.length - idx}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                              #{resp.id}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {formatDate(resp.submitted_at)}
                          </td>
                          <td
                            className="px-6 py-4 text-right space-x-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleViewDetail(resp.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleDeleteResponse(resp.id)}
                              disabled={actionLoadingId === resp.id}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition disabled:opacity-50"
                            >
                              {actionLoadingId === resp.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Response Details Modal */}
      {selectedResponseId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Response #{selectedResponseId}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Submitted
                  </span>
                </div>
                {selectedDetail && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(selectedDetail.submitted_at)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedResponseId(null);
                  setSelectedDetail(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {detailLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-slate-200 border-t-blue-600 mb-3"></div>
                  <p className="text-sm text-slate-500">Loading submission details...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {detailError}
                </div>
              ) : selectedDetail ? (
                selectedDetail.answers.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">
                    No answer records attached to this submission.
                  </p>
                ) : (
                  selectedDetail.answers.map((ans, idx) => (
                    <div
                      key={ans.id || idx}
                      className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {ans.question_title}
                          </h4>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getBadgeColor(
                            ans.question_type
                          )}`}
                        >
                          {ans.question_type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="pl-7 pt-1">
                        {renderAnswerValue(ans.question_type, ans.value)}
                      </div>
                    </div>
                  ))
                )
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleDeleteResponse(selectedResponseId)}
                disabled={actionLoadingId === selectedResponseId}
                className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              >
                Delete Response
              </button>
              <button
                onClick={() => {
                  setSelectedResponseId(null);
                  setSelectedDetail(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
