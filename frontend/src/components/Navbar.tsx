import Link from "next/link";

interface NavbarProps {
  formTitle?: string;
  formId?: number;
  currentTab?: "builder" | "responses" | "analytics";
  status?: "draft" | "published";
}

export function Navbar({ formTitle, formId, currentTab, status }: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight text-slate-900 flex items-center space-x-2 hover:opacity-80 transition"
            >
              <span className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                T
              </span>
              <span>Typeform Clone</span>
            </Link>

            {formTitle && formId && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">
                  {formTitle}
                </span>
                {status && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      status === "published"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
            )}
          </div>

          {formId ? (
            <div className="flex items-center space-x-1 sm:space-x-4">
              <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg text-sm">
                <Link
                  href={`/forms/${formId}/edit`}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    currentTab === "builder"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Builder
                </Link>
                <Link
                  href={`/forms/${formId}/responses`}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    currentTab === "responses"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Responses
                </Link>
                <Link
                  href={`/forms/${formId}/analytics`}
                  className={`px-3 py-1.5 rounded-md font-medium transition ${
                    currentTab === "analytics"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Analytics
                </Link>
              </nav>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/forms/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                + Create Form
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
