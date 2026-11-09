"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shield, Mail, Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const [applicationId, setApplicationId] = useState(() => searchParams.get("applicationId") || "");
  const [activeTab, setActiveTab] = useState<"EMAIL" | "MOBILE" | "ACTIVATION">(() => {
    const type = searchParams.get("type");
    return type === "MOBILE" || type === "ACTIVATION" ? type : "EMAIL";
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!applicationId) {
      setMessage({ text: "Application ID is required.", isError: true });
      return;
    }

    if (otp.length !== 6) {
      setMessage({ text: "Verification code must be exactly 6 digits.", isError: true });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: applicationId.trim(),
          type: activeTab,
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ text: data.error || data.message || "Verification failed.", isError: true });
      } else {
        setMessage({ text: data.message || "Verification successful!", isError: false });
        setOtp("");
      }
    } catch {
      setMessage({ text: "Network error. Please try again.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => { setActiveTab("EMAIL"); setMessage(null); }}
          className={`flex-1 pb-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "EMAIL"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Mail className="w-4 h-4" />
          Email OTP
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("MOBILE"); setMessage(null); }}
          className={`flex-1 pb-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "MOBILE"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Mobile OTP
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("ACTIVATION"); setMessage(null); }}
          className={`flex-1 pb-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "ACTIVATION"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Shield className="w-4 h-4" />
          Admin Activation
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
            message.isError
              ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
              : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {message.isError ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">{message.text}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Application ID
          </label>
          <input
            type="text"
            required
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            placeholder="cuid-app-identifier"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
            6-Digit Verification Code ({activeTab})
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full text-center tracking-widest text-lg font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying Code...
            </>
          ) : (
            "Verify Code"
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <Link
          href={`/registration-status?id=${applicationId}`}
          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 font-medium"
        >
          Check Application Status
        </Link>
        <Link
          href="/login"
          className="text-indigo-600 hover:text-indigo-500 font-medium"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vidyora
          </span>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Contact Verification
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Enter the 6-digit verification code sent to your registered contact.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading verification form...</div>}>
          <VerifyOtpContent />
        </Suspense>
      </div>
    </div>
  );
}
