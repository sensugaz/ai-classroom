'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import SummaryTab from '@/components/review/SummaryTab';
import VocabTable from '@/components/review/VocabTable';
import FlashcardsTab from '@/components/review/FlashcardsTab';

type Tab = 'summary' | 'vocabulary' | 'flashcards';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'summary', label: 'Summary', icon: '📝' },
  { id: 'vocabulary', label: 'Vocabulary', icon: '📖' },
  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
];

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  return (
    <main className="min-h-screen pb-12">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-200/50">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h1 className="text-2xl font-extrabold font-nunito text-white">
                  Lesson Review
                </h1>
                <p className="text-sm text-emerald-100 font-nunito">
                  Great work! Here is your lesson summary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[88px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3.5
                  text-base font-bold font-nunito
                  border-b-3 transition-all duration-200
                  touch-manipulation
                  ${
                    activeTab === tab.id
                      ? 'border-b-emerald-500 text-emerald-600 bg-emerald-50/50'
                      : 'border-b-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
                style={{ borderBottomWidth: '3px' }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        {activeTab === 'summary' && <SummaryTab sessionId={sessionId} />}
        {activeTab === 'vocabulary' && <VocabTable sessionId={sessionId} />}
        {activeTab === 'flashcards' && <FlashcardsTab sessionId={sessionId} />}
      </div>

      {/* Back to setup */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => router.push('/setup')}
        >
          ← Start New Lesson
        </Button>
      </div>
    </main>
  );
}
