"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { deleteForm, duplicateForm, getForms, publishForm, unpublishForm } from "@/lib/api";
import { Form } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getForms();
      setForms(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleTogglePublish = async (form: Form) => {
    try {
      setActionLoading(form.id);
      if (form.status === "published") {
        await unpublishForm(form.id);
      } else {
        await publishForm(form.id);
      }
      await loadForms();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (formId: number, formTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${formTitle}"? This will delete all questions and responses.`)) {
      return;
    }
    try {
      setActionLoading(formId);
      await deleteForm(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete form");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (formId: number) => {
    try {
      setActionLoading(formId);
      const duplicated = await duplicateForm(formId);
      router.push(`/forms/${duplicated.id}/edit`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to duplicate form");
      setActionLoading(null);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Forms</h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, manage, and analyze your Typeform-style surveys
            </p>
          </div>
          <Link
            href="/forms/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            + Create New Form
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
            <p className="text-slate-500 text-sm">Loading your forms...</p>
          </div>
        ) : error ? (
          <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-lg mx-auto">
            <p className="text-red-700 font-medium mb-3">{error}</p>
            <button
              onClick={loadForms}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition"
            >
              Try Again
            </button>
          </div>
        ) : forms.length === 0 ? (
          <div className="my-16 text-center max-w-md mx-auto p-8 bg-white border border-dashed border-slate-300 rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-xl font-bold mb-4">
              📝
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No forms yet</h3>
            <p className="text-slate-500 text-sm mb-6">
              Get started by creating your very first interactive form.
            </p>
            <Link
              href="/forms/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
            >
              Create Form
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        form.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {form.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(form.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <Link href={`/forms/${form.id}/edit`} className="group">
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {form.title}
                    </h3>
                  </Link>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">
                        {form.response_count}
                      </span>{" "}
                      {form.response_count === 1 ? "response" : "responses"}
                    </div>
                    {form.status === "published" && (
                      <Link
                        href={`/f/${form.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                      >
                        <span>Open public form</span>
                        <span>↗</span>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/forms/${form.id}/edit`}
                      className="text-slate-700 hover:text-blue-600 transition"
                    >
                      Edit
                    </Link>
                    <span className="text-slate-300">|</span>
                    <Link
                      href={`/forms/${form.id}/responses`}
                      className="text-slate-700 hover:text-blue-600 transition"
                    >
                      Responses
                    </Link>
                    <span className="text-slate-300">|</span>
                    <Link
                      href={`/forms/${form.id}/analytics`}
                      className="text-slate-700 hover:text-blue-600 transition"
                    >
                      Analytics
                    </Link>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDuplicate(form.id)}
                      disabled={actionLoading === form.id}
                      className="text-slate-600 hover:text-blue-600 cursor-pointer transition font-medium"
                      title="Duplicate this form"
                    >
                      {actionLoading === form.id ? "Duplicating..." : "Duplicate"}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleTogglePublish(form)}
                      disabled={actionLoading === form.id}
                      className={`cursor-pointer transition ${
                        form.status === "published"
                          ? "text-amber-600 hover:text-amber-700"
                          : "text-emerald-600 hover:text-emerald-700 font-semibold"
                      }`}
                    >
                      {actionLoading === form.id
                        ? "..."
                        : form.status === "published"
                        ? "Unpublish"
                        : "Publish"}
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleDelete(form.id, form.title)}
                      disabled={actionLoading === form.id}
                      className="text-red-500 hover:text-red-700 cursor-pointer transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
