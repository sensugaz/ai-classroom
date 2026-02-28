'use client';

import { Languages } from 'lucide-react';
import SetupForm from '@/components/setup/SetupForm';

export default function SetupPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] bg-slate-50">
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
              <Languages className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Classroom Translator
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Set up your lesson for real-time translation.
          </p>
        </header>

        <SetupForm />
      </div>
    </main>
  );
}
