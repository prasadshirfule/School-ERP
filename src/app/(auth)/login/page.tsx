import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Vidyora
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Smarter Schools. Better Learning.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-200 dark:border-slate-700">
          <div className="space-y-6">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-4 border border-indigo-100 dark:border-indigo-800">
              <div className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                Phase 1B Foundation Initialized
              </div>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                Authentication flows and credential verification will be activated in Phase 2.
              </p>
            </div>

            <div>
              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors"
              >
                Return to Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
