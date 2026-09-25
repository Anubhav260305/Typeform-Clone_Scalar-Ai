"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface NavbarProps {
  formTitle?: string;
  formId?: number;
  currentTab?: "builder" | "responses" | "analytics";
  status?: "draft" | "published";
}

interface MockUser {
  name: string;
  email: string;
}

const STORAGE_KEY = "typeform_mock_user";

export function Navbar({ formTitle, formId, currentTab, status }: NavbarProps) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [mounted, setMounted] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      // Storage unavailable or invalid JSON
    }
  }, []);

  const handleOpenModal = () => {
    setFullName("");
    setEmail("");
    setFormError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setFormError("Please enter your full name.");
      return;
    }
    if (!trimmedEmail) {
      setFormError("Please enter your email address.");
      return;
    }
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setFormError("Please enter a valid email address.");
      return;
    }

    const newUser: MockUser = {
      name: trimmedName,
      email: trimmedEmail,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore localStorage write error
    }

    setUser(newUser);
    setFormError(null);
    setSuccessMessage(`Welcome, ${trimmedName}!`);

    // Auto-close modal after brief greeting
    setTimeout(() => {
      setIsModalOpen(false);
      setSuccessMessage(null);
    }, 800);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore error
    }
    setUser(null);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Form Breadcrumbs */}
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
                  <span className="font-semibold text-slate-700 truncate max-w-[160px] sm:max-w-xs">
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

            {/* Right: Tab Navigation + Sign Up / User Profile */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {formId && (
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
              )}

              {/* User Logged in / Sign Up button */}
              {mounted && user ? (
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Logged in"></span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm max-w-[120px] sm:max-w-[160px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded hidden sm:inline">
                    Logged in
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-slate-400 hover:text-rose-600 transition ml-1 cursor-pointer font-medium"
                    title="Sign out"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
                >
                  Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mock Signup Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-black mb-3">
                T
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                Create your account
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Sign up to start creating and sharing interactive forms.
              </p>
            </div>

            {/* Success State */}
            {successMessage ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-xl font-bold">
                  ✓
                </div>
                <h4 className="text-base font-bold text-slate-900">{successMessage}</h4>
                <p className="text-xs text-slate-500">Signing you in...</p>
              </div>
            ) : (
              /* Signup Form */
              <form onSubmit={handleSignUp} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jane@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm transition cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>

                <p className="text-center text-[11px] text-slate-400 mt-3">
                  This demo stores your mock session locally in your browser.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
