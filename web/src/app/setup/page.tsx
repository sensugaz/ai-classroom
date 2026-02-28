'use client';

import { Languages } from 'lucide-react';
import SetupForm from '@/components/setup/SetupForm';

export default function SetupPage() {
  return (
    <main className="min-h-screen min-h-[100dvh] pt-safe">
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-16 pb-20">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl glass border border-white/[0.08]">
              <Languages className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight"
            style={{
              textShadow: '0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(6, 182, 212, 0.1)',
            }}
          >
            Classroom Translator
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Set up your lesson for real-time translation
          </p>
        </header>

        {/* Form */}
        <SetupForm />
      </div>
    </main>
  );
}
