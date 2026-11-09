import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            Vidyora
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Smarter Schools. Better Learning.
          </p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Phase 1B Foundation Active
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-tenant Indian School ERP foundation with strict server-side tenant isolation, PostgreSQL Row-Level Security, and offline fee collection.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Access Portal
            </Link>
            <Link
              href="/api/health"
              className="w-full inline-flex justify-center items-center px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              System Health Check
            </Link>
          </div>
        </div>

        <div className="text-xs text-slate-400 dark:text-slate-500 pt-2">
          &copy; {new Date().getFullYear()} Vidyora. All rights reserved.
        </div>
      </div>
    </main>
  );
}
