"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { createForm, createQuestion } from "@/lib/api";
import { QuestionType } from "@/lib/types";

interface TemplateQuestion {
  title: string;
  type: QuestionType;
  description?: string;
  required: boolean;
  settings?: Record<string, unknown> | null;
}

interface FormTemplate {
  id: "blank" | "customer_feedback" | "event_registration" | "employee_satisfaction";
  title: string;
  tagline: string;
  badge: string;
  icon: string;
  questions: TemplateQuestion[];
}

const TEMPLATES: FormTemplate[] = [
  {
    id: "blank",
    title: "Blank Form",
    tagline: "Start with an empty canvas and build your custom questions from scratch.",
    badge: "Blank",
    icon: "📄",
    questions: [],
  },
  {
    id: "customer_feedback",
    title: "Customer Feedback",
    tagline: "Gather customer ratings, testimonial highlights, and areas for improvement.",
    badge: "6 Questions",
    icon: "⭐",
    questions: [
      {
        title: "What is your name?",
        type: "short_text",
        required: true,
      },
      {
        title: "How would you rate your overall experience?",
        type: "rating",
        required: true,
        settings: { min_rating: 1, max_rating: 5 },
      },
      {
        title: "What did you like most about your experience?",
        type: "long_text",
        required: false,
      },
      {
        title: "How did you hear about us?",
        type: "dropdown",
        required: false,
        settings: {
          options: [
            "Google Search",
            "Social Media",
            "Friend / Referral",
            "Advertisement",
            "Other",
          ],
        },
      },
      {
        title: "Would you recommend us to a friend?",
        type: "yes_no",
        required: true,
      },
      {
        title: "What could we improve?",
        type: "long_text",
        required: false,
      },
    ],
  },
  {
    id: "event_registration",
    title: "Event Registration",
    tagline: "Collect attendee names, contact info, session choices, and attendance preferences.",
    badge: "7 Questions",
    icon: "🎟️",
    questions: [
      {
        title: "Full Name",
        type: "short_text",
        required: true,
      },
      {
        title: "Email Address",
        type: "email",
        required: true,
      },
      {
        title: "Age",
        type: "number",
        required: true,
      },
      {
        title: "Which session are you interested in?",
        type: "multiple_choice",
        required: true,
        settings: {
          options: [
            "Cybersecurity",
            "Artificial Intelligence",
            "Cloud Computing",
            "Web Development",
          ],
        },
      },
      {
        title: "How did you hear about this event?",
        type: "dropdown",
        required: false,
        settings: {
          options: [
            "LinkedIn",
            "Instagram",
            "College",
            "Friend",
            "Other",
          ],
        },
      },
      {
        title: "Any questions or expectations from the event?",
        type: "long_text",
        required: false,
      },
      {
        title: "Would you like to attend future events?",
        type: "yes_no",
        required: false,
      },
    ],
  },
  {
    id: "employee_satisfaction",
    title: "Employee Satisfaction",
    tagline: "Survey team morale, department feedback, tenure, and workplace satisfaction.",
    badge: "7 Questions",
    icon: "👥",
    questions: [
      {
        title: "Employee Name",
        type: "short_text",
        required: true,
      },
      {
        title: "How satisfied are you with your current role?",
        type: "rating",
        required: true,
        settings: { min_rating: 1, max_rating: 5 },
      },
      {
        title: "Which department do you work in?",
        type: "dropdown",
        required: true,
        settings: {
          options: [
            "Engineering",
            "Marketing",
            "Sales",
            "Human Resources",
            "Finance",
          ],
        },
      },
      {
        title: "What do you enjoy most about working here?",
        type: "long_text",
        required: false,
      },
      {
        title: "Do you feel supported by your team?",
        type: "yes_no",
        required: true,
      },
      {
        title: "How many months have you been with the company?",
        type: "number",
        required: false,
      },
      {
        title: "Would you recommend this company as a workplace?",
        type: "yes_no",
        required: false,
      },
    ],
  },
];

export default function NewFormPage() {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate =
    TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplateId(template.id);
    if (template.id === "blank") {
      setTitle("");
    } else {
      setTitle(template.title);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || (selectedTemplate.id === "blank" ? "Untitled Form" : selectedTemplate.title);

    try {
      setLoading(true);
      setError(null);
      setProgressText("Creating form...");

      // 1. Create form using the existing form creation API
      const form = await createForm({ title: finalTitle });

      // 2. If template has questions, create each using existing question API
      if (selectedTemplate.questions.length > 0) {
        for (let i = 0; i < selectedTemplate.questions.length; i++) {
          const q = selectedTemplate.questions[i];
          setProgressText(`Adding question ${i + 1} of ${selectedTemplate.questions.length}...`);
          await createQuestion(form.id, {
            title: q.title,
            type: q.type,
            description: q.description || null,
            required: q.required,
            order_index: i,
            settings: q.settings || null,
          });
        }
      }

      setProgressText("Redirecting to builder...");
      router.push(`/forms/${form.id}/edit`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create form");
      setLoading(false);
      setProgressText("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition inline-flex items-center gap-1 mb-3"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Create a New Form
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a pre-configured template to jumpstart your survey, or start with a clean slate.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Template Selection Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Choose a Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => !loading && handleSelectTemplate(tmpl)}
                    className={`p-5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-white shadow-md ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-2xl">{tmpl.icon}</span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tmpl.badge}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {tmpl.tagline}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">
                        {tmpl.questions.length === 0
                          ? "0 configured questions"
                          : `${tmpl.questions.length} ready-to-use questions`}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        {isSelected ? "Selected ✓" : "Select"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Title & Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Form Title
              </label>
              <input
                type="text"
                required
                disabled={loading}
                placeholder={
                  selectedTemplate.id === "blank"
                    ? "e.g., My New Survey"
                    : selectedTemplate.title
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-medium"
              />
            </div>

            {/* Template Questions Preview */}
            {selectedTemplate.questions.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Questions included in this template:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedTemplate.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800">{q.title}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                          {q.type.replace("_", " ")}
                        </span>
                        {q.required && (
                          <span className="text-[10px] text-red-500 font-bold">*</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>{progressText || "Creating..."}</span>
                </>
              ) : selectedTemplate.id === "blank" ? (
                <span>Create Blank Form →</span>
              ) : (
                <span>Create from Template ({selectedTemplate.questions.length} Questions) →</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
