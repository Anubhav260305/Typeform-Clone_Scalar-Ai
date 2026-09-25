"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  createQuestion,
  deleteQuestion,
  getForm,
  getQuestions,
  publishForm,
  reorderQuestions,
  unpublishForm,
  updateForm,
  updateQuestion,
} from "@/lib/api";
import { Form, Question, QuestionType } from "@/lib/types";

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string; desc: string }[] = [
  { type: "short_text", label: "Short Text", icon: "✏️", desc: "A single line text input" },
  { type: "long_text", label: "Long Text", icon: "📄", desc: "A multi-line paragraph input" },
  { type: "multiple_choice", label: "Multiple Choice", icon: "🔘", desc: "Pick one from multiple options" },
  { type: "dropdown", label: "Dropdown", icon: "▾", desc: "Select from a dropdown menu" },
  { type: "email", label: "Email", icon: "✉️", desc: "Validated email address" },
  { type: "number", label: "Number", icon: "#️⃣", desc: "Numeric value with optional limits" },
  { type: "yes_no", label: "Yes / No", icon: "⚖️", desc: "Simple boolean choice" },
  { type: "rating", label: "Rating", icon: "⭐", desc: "Numeric rating scale (e.g. 1 to 5)" },
];

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const formId = parseInt(id, 10);

  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Title edit state
  const [titleEditing, setTitleEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");

  // Modals & Active Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Question>>({});
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [formData, questionsData] = await Promise.all([
        getForm(formId),
        getQuestions(formId),
      ]);
      setForm(formData);
      setFormTitle(formData.title);
      setQuestions(questionsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(formId)) {
      loadData();
    }
  }, [formId]);

  const handleSaveTitle = async () => {
    if (!form || !formTitle.trim() || formTitle.trim() === form.title) {
      setTitleEditing(false);
      return;
    }
    try {
      const updated = await updateForm(form.id, { title: formTitle.trim() });
      setForm(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update title");
      setFormTitle(form.title);
    } finally {
      setTitleEditing(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!form) return;
    try {
      setPublishLoading(true);
      let updated: Form;
      if (form.status === "published") {
        updated = await unpublishForm(form.id);
      } else {
        updated = await publishForm(form.id);
      }
      setForm(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleAddQuestion = async (type: QuestionType) => {
    setShowAddModal(false);
    try {
      const defaultSettings: Record<string, unknown> = {};
      if (type === "multiple_choice" || type === "dropdown") {
        defaultSettings.options = ["Option 1", "Option 2"];
      } else if (type === "rating") {
        defaultSettings.min_rating = 1;
        defaultSettings.max_rating = 5;
      }

      const newQ = await createQuestion(formId, {
        title: `Untitled ${type.replace("_", " ")} question`,
        type,
        required: false,
        settings: defaultSettings,
      });

      const updatedQuestions = [...questions, newQ];
      setQuestions(updatedQuestions);
      startEditingQuestion(newQ);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create question");
    }
  };

  const startEditingQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditFormData({
      title: q.title,
      description: q.description || "",
      required: q.required,
      type: q.type,
      settings: q.settings ? JSON.parse(JSON.stringify(q.settings)) : {},
    });
  };

  const handleSaveQuestion = async (qId: number) => {
    try {
      setSavingQuestion(true);
      const updated = await updateQuestion(qId, {
        title: editFormData.title?.trim() || "Untitled Question",
        description: editFormData.description ? editFormData.description.trim() : null,
        required: editFormData.required,
        settings: editFormData.settings,
      });
      setQuestions((prev) => prev.map((q) => (q.id === qId ? updated : q)));
      setEditingQuestionId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId: number, qTitle: string) => {
    if (!confirm(`Delete "${qTitle}"?`)) return;
    try {
      await deleteQuestion(qId);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      if (editingQuestionId === qId) setEditingQuestionId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    const questionIds = newQuestions.map((q) => q.id);
    try {
      const reordered = await reorderQuestions(formId, questionIds);
      setQuestions(reordered);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reorder questions");
    }
  };

  const copyPublicUrl = () => {
    if (!form) return;
    const publicUrl = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mb-2"></div>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl border border-red-200 text-center max-w-md">
            <p className="text-red-600 font-medium mb-4">{error || "Form not found"}</p>
            <Link href="/dashboard" className="text-sm font-semibold text-blue-600 hover:underline">
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        formId={form.id}
        formTitle={form.title}
        currentTab="builder"
        status={form.status}
      />

      {/* SUB-HEADER / ACTIONS BAR */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {titleEditing ? (
              <input
                type="text"
                autoFocus
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                className="text-xl font-bold text-slate-900 border-b-2 border-blue-600 focus:outline-none px-1 py-0.5 bg-slate-50 rounded"
              />
            ) : (
              <div
                onClick={() => setTitleEditing(true)}
                className="group flex items-center space-x-2 cursor-pointer"
                title="Click to rename form"
              >
                <h1 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                  {form.title}
                </h1>
                <span className="text-xs text-slate-400 group-hover:text-blue-500">✎</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {form.status === "published" ? (
              <>
                <button
                  onClick={copyPublicUrl}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  {copiedLink ? "✓ Link Copied" : "Copy Link"}
                </button>
                <Link
                  href={`/f/${form.slug}`}
                  target="_blank"
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  <span>Open Form</span>
                  <span>↗</span>
                </Link>
                <button
                  onClick={handleTogglePublish}
                  disabled={publishLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {publishLoading ? "..." : "Unpublish"}
                </button>
              </>
            ) : (
              <button
                onClick={handleTogglePublish}
                disabled={publishLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{publishLoading ? "Publishing..." : "Publish Form"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BUILDER CONTENT */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Questions ({questions.length})</h2>
            <p className="text-xs text-slate-500">
              Questions will be displayed one at a time to respondents in this order.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Add Question</span>
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="text-3xl mb-3">🧩</div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Your form is empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Add your first question to start building your interactive respondent flow.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
            >
              + Add First Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`bg-white rounded-xl border transition ${
                  editingQuestionId === q.id
                    ? "border-blue-500 shadow-md ring-2 ring-blue-50"
                    : "border-slate-200 shadow-sm hover:border-slate-300"
                }`}
              >
                {/* QUESTION ROW HEADER */}
                <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-semibold text-slate-900 text-sm truncate">
                          {q.title}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded uppercase tracking-wider">
                          {q.type.replace("_", " ")}
                        </span>
                        {q.required && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded uppercase tracking-wider">
                            Required
                          </span>
                        )}
                      </div>
                      {q.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{q.description}</p>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleMoveQuestion(idx, "up")}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(idx, "down")}
                      disabled={idx === questions.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() =>
                        editingQuestionId === q.id
                          ? setEditingQuestionId(null)
                          : startEditingQuestion(q)
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                    >
                      {editingQuestionId === q.id ? "Close" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id, q.title)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* INLINE QUESTION EDITOR */}
                {editingQuestionId === q.id && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 rounded-b-xl space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Question Title
                      </label>
                      <input
                        type="text"
                        value={editFormData.title || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, title: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter question title..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Help / Description Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={editFormData.description || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, description: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add extra guidance for respondent..."
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id={`req-${q.id}`}
                        type="checkbox"
                        checked={editFormData.required || false}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, required: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor={`req-${q.id}`}
                        className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                      >
                        Required (respondent cannot skip)
                      </label>
                    </div>

                    {/* TYPE SPECIFIC CONFIGURATION */}
                    {(q.type === "multiple_choice" || q.type === "dropdown") && (
                      <div className="border-t border-slate-200 pt-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Configured Choices:
                        </label>
                        <div className="space-y-2">
                          {(
                            (editFormData.settings?.options as string[]) || ["Option 1"]
                          ).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <span className="text-xs text-slate-400 font-mono w-4">
                                {optIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const opts = [
                                    ...((editFormData.settings?.options as string[]) || []),
                                  ];
                                  opts[optIdx] = e.target.value;
                                  setEditFormData({
                                    ...editFormData,
                                    settings: { ...editFormData.settings, options: opts },
                                  });
                                }}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const opts = (
                                    (editFormData.settings?.options as string[]) || []
                                  ).filter((_, i) => i !== optIdx);
                                  setEditFormData({
                                    ...editFormData,
                                    settings: { ...editFormData.settings, options: opts },
                                  });
                                }}
                                className="text-slate-400 hover:text-red-500 px-2 py-1 text-xs cursor-pointer"
                                title="Remove Choice"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = [
                              ...((editFormData.settings?.options as string[]) || []),
                            ];
                            opts.push(`Option ${opts.length + 1}`);
                            setEditFormData({
                              ...editFormData,
                              settings: { ...editFormData.settings, options: opts },
                            });
                          }}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          + Add Choice
                        </button>
                      </div>
                    )}

                    {q.type === "rating" && (
                      <div className="border-t border-slate-200 pt-3 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Min Rating
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={
                              typeof editFormData.settings?.min_rating === "number"
                                ? editFormData.settings.min_rating
                                : 1
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                settings: {
                                  ...editFormData.settings,
                                  min_rating: parseInt(e.target.value, 10) || 1,
                                },
                              })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Max Rating
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="10"
                            value={
                              typeof editFormData.settings?.max_rating === "number"
                                ? editFormData.settings.max_rating
                                : 5
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                settings: {
                                  ...editFormData.settings,
                                  max_rating: parseInt(e.target.value, 10) || 5,
                                },
                              })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditingQuestionId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingQuestion}
                        onClick={() => handleSaveQuestion(q.id)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                      >
                        {savingQuestion ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* QUESTION TYPE SELECTOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Select Question Type</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-5">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => handleAddQuestion(t.type)}
                  className="flex items-start p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition cursor-pointer group"
                >
                  <span className="text-2xl mr-3 shrink-0">{t.icon}</span>
                  <div>
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 block">
                      {t.label}
                    </span>
                    <span className="text-xs text-slate-500 line-clamp-1">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
