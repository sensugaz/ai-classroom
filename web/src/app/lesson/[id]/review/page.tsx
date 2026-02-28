'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, BookOpen, Layers } from 'lucide-react';
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
    <main className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">
              Lesson Review
            </h1>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[57px] z-40 bg-white border-b border-slate-200">
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
                    text-sm font-medium rounded-lg
                    transition-colors duration-150
                    touch-manipulation
                    ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
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
          className="w-full py-3 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start New Lesson
        </button>
      </div>
    </main>
  );
}
