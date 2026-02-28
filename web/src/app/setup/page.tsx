'use client';

import SetupForm from '@/components/setup/SetupForm';

export default function SetupPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-indigo-50 via-white to-violet-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 sm:px-6 pt-safe">
        <div className="max-w-lg mx-auto py-6 sm:py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl mb-3 sm:mb-4">
              <span className="text-3xl sm:text-4xl">🎓</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-nunito text-white">
              Classroom Translator
            </h1>
            <p className="text-sm sm:text-base text-indigo-200 font-nunito mt-1">
              Real-time translation for your classroom
            </p>
          </div>
        </div>
        {/* Curved bottom */}
        <div className="h-6 bg-gradient-to-b from-transparent to-indigo-50 rounded-t-[2rem]" />
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 sm:px-6 pb-8 -mt-1">
        <SetupForm />
      </div>
    </main>
  );
}
