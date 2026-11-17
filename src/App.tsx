import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LESSONS, QUIZ_QUESTIONS } from './data/curriculum';
import { OverviewView } from './components/OverviewView';
import { LessonWorkspaceView } from './components/LessonWorkspaceView';
import { SandboxView } from './components/SandboxView';
import { CheatsheetView } from './components/CheatsheetView';
import { QuizView } from './components/QuizView';

type AppView = 'overview' | 'lesson' | 'sandbox' | 'cheatsheet' | 'quiz';

const STORAGE_COMPLETED_KEY = 'pycraft_completed_lessons_v1';
const STORAGE_QUIZ_KEY = 'pycraft_best_quiz_score_v1';

export default function App() {
  const [view, setView] = useState<AppView>('overview');
  const [activeLessonId, setActiveLessonId] = useState<string>(LESSONS[0].id);
  const [sandboxSeedCode, setSandboxSeedCode] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_COMPLETED_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [bestQuizScore, setBestQuizScore] = useState<number | null>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_QUIZ_KEY);
      if (raw === null) return null;
      const num = Number(raw);
      return Number.isNaN(num) ? null : num;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(completedLessonIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [completedLessonIds]);

  useEffect(() => {
    if (bestQuizScore === null) return;
    try {
      window.localStorage.setItem(STORAGE_QUIZ_KEY, String(bestQuizScore));
    } catch {
      // Ignore storage quota errors
    }
  }, [bestQuizScore]);

  const navigateTo = (nextView: AppView) => {
    setView(nextView);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    navigateTo('lesson');
  };

  const handleMarkCompleted = (lessonId: string) => {
    setCompletedLessonIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]));
  };

  const handleRunInSandbox = (code: string) => {
    setSandboxSeedCode(code);
    navigateTo('sandbox');
  };

  const handleFinishQuiz = (score: number) => {
    setBestQuizScore((prev) => (prev === null ? score : Math.max(prev, score)));
  };

  const nextLesson = LESSONS.find((l) => !completedLessonIds.includes(l.id)) || LESSONS[0];

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'overview', label: '課程總覽' },
    { id: 'sandbox', label: '互動實驗室' },
    { id: 'cheatsheet', label: '語法速查' },
    { id: 'quiz', label: '隨堂測驗' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('overview')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            PyCraft 學苑
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav aria-label="主要導覽" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive =
                view === item.id || (view === 'lesson' && item.id === 'overview');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'sandbox') setSandboxSeedCode(undefined);
                    navigateTo(item.id);
                  }}
                  className={`py-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-blue-700 border-blue-700'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectLesson(nextLesson.id)}
              className="hidden md:inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {completedLessonIds.length === 0 ? '開始學習' : '繼續學習'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? '關閉導覽選單' : '開啟導覽選單'}
              className="md:hidden p-2 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'sandbox') setSandboxSeedCode(undefined);
                  navigateTo(item.id);
                }}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  view === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelectLesson(nextLesson.id)}
              className="w-full mt-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
            >
              {completedLessonIds.length === 0 ? '開始第一課' : `繼續第 ${nextLesson.number} 課`}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {view === 'overview' && (
          <OverviewView
            lessons={LESSONS}
            completedLessonIds={completedLessonIds}
            bestQuizScore={bestQuizScore}
            totalQuizQuestions={QUIZ_QUESTIONS.length}
            onSelectLesson={handleSelectLesson}
            onOpenSandbox={() => {
              setSandboxSeedCode(undefined);
              navigateTo('sandbox');
            }}
            onOpenQuiz={() => navigateTo('quiz')}
          />
        )}

        {view === 'lesson' && (
          <LessonWorkspaceView
            lessons={LESSONS}
            activeLessonId={activeLessonId}
            completedLessonIds={completedLessonIds}
            onSelectLesson={handleSelectLesson}
            onMarkCompleted={handleMarkCompleted}
            onBackToOverview={() => navigateTo('overview')}
          />
        )}

        {view === 'sandbox' && (
          <SandboxView key={sandboxSeedCode ?? 'default'} initialCode={sandboxSeedCode} />
        )}

        {view === 'cheatsheet' && <CheatsheetView onRunInSandbox={handleRunInSandbox} />}

        {view === 'quiz' && (
          <QuizView
            bestScore={bestQuizScore}
            onFinishQuiz={handleFinishQuiz}
            onReviewLesson={handleSelectLesson}
          />
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>PyCraft 學苑 · Python 互動式程式設計教材</span>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigateTo('overview')}
              className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              課程總覽
            </button>
            <button
              type="button"
              onClick={() => navigateTo('sandbox')}
              className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              互動實驗室
            </button>
            <button
              type="button"
              onClick={() => navigateTo('cheatsheet')}
              className="hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              語法速查
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletedLessonIds([]);
                setBestQuizScore(null);
                window.localStorage.removeItem(STORAGE_COMPLETED_KEY);
                window.localStorage.removeItem(STORAGE_QUIZ_KEY);
              }}
              className="hover:text-red-700 cursor-pointer whitespace-nowrap"
            >
              重設學習紀錄
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
