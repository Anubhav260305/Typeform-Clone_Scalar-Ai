"use client";

import { useEffect, useState, use } from "react";
import { getPublicForm, submitResponse } from "@/lib/api";
import { PublicForm } from "@/lib/types";
import { RespondentView } from "@/components/RespondentView";

export default function PublicRespondentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  const handleSubmit = async (answers: Record<number, unknown>) => {
    const formattedAnswers = Object.entries(answers)
      .filter(([, val]) => val !== undefined && val !== null && val !== "")
      .map(([qId, val]) => ({
        question_id: parseInt(qId, 10),
        value: val,
      }));

    await submitResponse(form.id, { answers: formattedAnswers });
  };

  return (
    <RespondentView
      formTitle={form.title}
      questions={form.questions}
      onSubmit={handleSubmit}
    />
  );
}
