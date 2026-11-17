import { ArrowRight, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { Lesson, TRACKS } from '../data/curriculum';
import { ResilientImage } from './ResilientImage';

interface OverviewViewProps {
  lessons: Lesson[];
  completedLessonIds: string[];
  bestQuizScore: number | null;
  totalQuizQuestions: number;
  onSelectLesson: (lessonId: string) => void;
  onOpenSandbox: () => void;
  onOpenQuiz: () => void;
}

export function OverviewView({
  lessons,
  completedLessonIds,
  bestQuizScore,
  totalQuizQuestions,
  onSelectLesson,
  onOpenSandbox,
  onOpenQuiz,
}: OverviewViewProps) {
  const nextLesson = lessons.find((l) => !completedLessonIds.includes(l.id)) || lessons[0];
  const completedCount = completedLessonIds.length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="space-y-12">
      {/* Hero Split (2-column items-stretch) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-8 md:p-10">
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>互動式程式設計課程</span>
              <span aria-hidden="true">·</span>
              <span>瀏覽器即時執行</span>
              <span aria-hidden="true">·</span>
              <span>記憶體單步視覺化</span>
            </div>

            <h1 className="text-[clamp(2rem,3.6vw,3.125rem)] font-bold leading-[1.15] tracking-tight text-slate-900 text-balance">
              從邏輯直覺出發，系統化掌握 Python 核心語法
            </h1>

            <p className="text-base leading-relaxed text-slate-600 max-w-2xl">
              不必安裝任何環境，直接在網頁上撰寫並執行 Python 程式碼。透過獨家的單步執行透視鏡，逐行觀察變數記憶體變化與函式呼叫堆疊，搭配即時自動化批改建立扎實的程式思維。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-8">
            <button
              type="button"
              onClick={() => onSelectLesson(nextLesson.id)}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{completedCount === 0 ? '開始第 01 課' : `繼續第 ${nextLesson.number} 課`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenSandbox}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-blue-700" />
              <span>開啟互動實驗室</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <ResilientImage
            src="/src/assets/images/hero_python_studio_1794898989155.jpg"
            alt="Python 程式設計資料流與邏輯模組架構圖"
            fallbackTitle="Python 互動學習架構"
            className="w-full h-64 lg:h-full object-cover"
          />
        </div>
      </section>

      {/* 4-Column Curriculum Summary Strip */}
      <section aria-label="學習進度摘要" className="bg-white border border-slate-200 rounded-xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-6">
            <div className="text-xs font-medium text-slate-500 mb-1.5">課程完成進度</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {completedCount} / {lessons.length} 堂
            </div>
            <div className="text-xs text-slate-500 mt-1 tabular-nums">完成率 {progressPercent}%</div>
          </div>

          <div className="p-6">
            <div className="text-xs font-medium text-slate-500 mb-1.5">實作驗證挑戰</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {completedCount} 項通過
            </div>
            <div className="text-xs text-slate-500 mt-1">每堂課均附自動化測試</div>
          </div>

          <div className="p-6">
            <div className="text-xs font-medium text-slate-500 mb-1.5">隨堂測驗最高分</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {bestQuizScore !== null ? `${bestQuizScore} / ${totalQuizQuestions}` : '尚未作答'}
            </div>
            <button
              type="button"
              onClick={onOpenQuiz}
              className="text-xs font-medium text-blue-700 hover:underline mt-1 cursor-pointer whitespace-nowrap"
            >
              {bestQuizScore !== null ? '重新挑戰測驗' : '前往隨堂測驗'}
            </button>
          </div>

          <div className="p-6">
            <div className="text-xs font-medium text-slate-500 mb-1.5">規劃學習階段</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">3 大階段</div>
            <div className="text-xs text-slate-500 mt-1">基礎語法至物件導向</div>
          </div>
        </div>
      </section>

      {/* 3 Learning Tracks */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">系統化學習路徑</h2>
            <p className="text-sm text-slate-600 mt-1">
              依照概念相依性編排的九堂核心課程，點選任意單元即可進入互動編輯與練習環境。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TRACKS.map((track) => {
            const trackLessons = lessons.filter((l) => l.trackId === track.id);
            const trackDone = trackLessons.filter((l) => completedLessonIds.includes(l.id)).length;

            return (
              <article
                key={track.id}
                className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="aspect-[4/3] w-full border-b border-slate-200 bg-slate-50 overflow-hidden">
                  <ResilientImage
                    src={track.imageUrl}
                    alt={track.imageAlt}
                    fallbackTitle={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-medium text-slate-700">{track.number}</span>
                    <span aria-hidden="true">·</span>
                    <span>{track.levelLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      進度 {trackDone}/{trackLessons.length}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">{track.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">{track.subtitle}</p>

                  <div className="mt-auto divide-y divide-slate-100 border-t border-slate-100">
                    {trackLessons.map((lesson) => {
                      const isDone = completedLessonIds.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => onSelectLesson(lesson.id)}
                          className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                              {lesson.number}. {lesson.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                              {lesson.duration}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" />
                                已完成
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-blue-700">
                                <Circle className="w-4 h-4" />
                                開始
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
