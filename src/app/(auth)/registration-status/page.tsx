"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface ApplicationDetails {
  id: string;
  schoolName: string;
  schoolEmail: string;
  boardType: string;
  status: "PENDING" | "UNDER_REVIEW" | "DOCUMENTS_REQUESTED" | "APPROVED" | "REJECTED";
  emailVerifiedAt: string | null;
  mobileVerifiedAt: string | null;
  requestedDocuments: string | null;
  rejectionReason: string | null;
  createdSchoolId: string | null;
  createdAt: string;
}

function StatusContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";
  const [query, setQuery] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    setApplication(null);

    const isEmail = searchTerm.includes("@");
    const param = isEmail ? `email=${encodeURIComponent(searchTerm.trim())}` : `id=${encodeURIComponent(searchTerm.trim())}`;

    try {
      const res = await fetch(`/api/auth/registration-status?${param}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Application not found.");
      } else {
        setApplication(data.application);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialId) return;
    let isMounted = true;
    const load = async () => {
      const isEmail = initialId.includes("@");
      const param = isEmail
        ? `email=${encodeURIComponent(initialId.trim())}`
        : `id=${encodeURIComponent(initialId.trim())}`;
      try {
        const res = await fetch(`/api/auth/registration-status?${param}`);
        const data = await res.json();
        if (isMounted) {
          if (!res.ok || !data.success) {
            setError(data.error || "Application not found.");
          } else {
            setApplication(data.application);
          }
        }
      } catch {
        if (isMounted) {
          setError("Network error. Please try again.");
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [initialId]);

  const getStatusBadge = (status: ApplicationDetails["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            Under Review
          </span>
        );
      case "DOCUMENTS_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Documents Requested
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5" />
            Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchStatus(query);
        }}
        className="mb-6"
      >
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">
          Application ID or School Email
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. contact@school.edu.in or cuid"
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-700 dark:text-rose-300">{error}</div>
        </div>
      )}

      {application && (
        <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {application.schoolName}
              </h3>
              <p className="text-xs text-slate-500">{application.schoolEmail}</p>
            </div>
            {getStatusBadge(application.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
            <div>
              <span className="text-slate-400 block mb-0.5">Board / System</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {application.boardType}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Application Submitted</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {new Date(application.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email Verified</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {application.emailVerifiedAt ? "Verified ✓" : "Pending Verification"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Mobile Verified</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {application.mobileVerifiedAt ? "Verified ✓" : "Pending Verification"}
              </span>
            </div>
          </div>

          {application.status === "APPROVED" && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 space-y-3">
              <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Application Approved!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Your institution has been onboarded. Use your administrator credentials or activation code to sign in.
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/verify-otp?applicationId=${application.id}&type=ACTIVATION`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                >
                  Activate Administrator
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 inline-block"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}

          {application.status === "DOCUMENTS_REQUESTED" && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900">
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                Additional Documentation Required
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {application.requestedDocuments || "Affiliation certificate and trust deed required."}
              </p>
            </div>
          )}

          {application.status === "REJECTED" && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900">
              <div className="text-sm font-semibold text-rose-800 dark:text-rose-300 mb-1">
                Application Rejected
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                {application.rejectionReason || "Application did not meet registration criteria."}
              </p>
            </div>
          )}

          {(!application.emailVerifiedAt || !application.mobileVerifiedAt) && (
            <div className="text-center pt-2">
              <Link
                href={`/verify-otp?applicationId=${application.id}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1"
              >
                Complete Contact Verification
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RegistrationStatusPage() {
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
          Registration Application Status
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Check the real-time review status of your school application.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading status...</div>}>
          <StatusContent />
        </Suspense>
      </div>
    </div>
  );
}
