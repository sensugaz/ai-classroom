'use client';

import SetupForm from '@/components/setup/SetupForm';

export default function SetupPage() {
  return (
    <main className="min-h-screen pb-12">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 shadow-lg shadow-indigo-200/50">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎓</span>
            <div>
              <h1 className="text-2xl font-extrabold font-nunito text-white">
                Classroom Translator
              </h1>
              <p className="text-sm text-indigo-200 font-nunito">
                Set up your lesson and start translating
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <SetupForm />
      </div>
    </main>
  );
}
