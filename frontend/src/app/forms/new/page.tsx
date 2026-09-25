"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { createForm } from "@/lib/api";

export default function NewFormPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a form title");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const form = await createForm({ title: title.trim() });
      router.push(`/forms/${form.id}/edit`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create form");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full p-8">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1 mb-3"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create a New Form</h1>
            <p className="text-sm text-slate-500 mt-1">
              Give your form a name to get started. You can add questions next.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Form Title
              </label>
              <input
                id="title"
                type="text"
                required
                autoFocus
                placeholder="e.g., Customer Satisfaction Survey, Event Registration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Continue to Builder →</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
