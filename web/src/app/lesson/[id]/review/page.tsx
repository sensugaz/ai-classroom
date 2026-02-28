'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, BookOpen, Layers, Sparkles } from 'lucide-react';
import SummaryTab from '@/components/review/SummaryTab';
import VocabTable from '@/components/review/VocabTable';
import FlashcardsTab from '@/components/review/FlashcardsTab';

type Tab = 'summary' | 'vocabulary' | 'flashcards';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
];

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  return (
    <main className="min-h-screen bg-[#0a0a0f] pb-12">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-100">
              Lesson Review
            </h1>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[57px] z-40 bg-white/5 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2
                    text-sm font-medium rounded-full
                    transition-all duration-200
                    touch-manipulation
                    ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        {activeTab === 'summary' && <SummaryTab sessionId={sessionId} />}
        {activeTab === 'vocabulary' && <VocabTable sessionId={sessionId} />}
        {activeTab === 'flashcards' && <FlashcardsTab sessionId={sessionId} />}
      </div>

      {/* Start New Lesson */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <button
          onClick={() => router.push('/setup')}
          className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 transition-all glow-cyan flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Start New Lesson
        </button>
      </div>
    </main>
  );
}
