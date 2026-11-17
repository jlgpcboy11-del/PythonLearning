import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Play,
  ClipboardCheck,
  Code2,
} from 'lucide-react';
import { Lesson, TRACKS } from '../data/curriculum';
import { ExecutionResult, executePython } from '../lib/pythonEngine';
import { PythonWorkbench } from './PythonWorkbench';

interface LessonWorkspaceViewProps {
  lessons: Lesson[];
  activeLessonId: string;
  completedLessonIds: string[];
  onSelectLesson: (lessonId: string) => void;
  onMarkCompleted: (lessonId: string) => void;
  onBackToOverview: () => void;
}

export function LessonWorkspaceView({
  lessons,
  activeLessonId,
  completedLessonIds,
  onSelectLesson,
  onMarkCompleted,
  onBackToOverview,
}: LessonWorkspaceViewProps) {
  const lessonIndex = Math.max(
    0,
    lessons.findIndex((l) => l.id === activeLessonId)
  );
  const lesson = lessons[lessonIndex];
  const track = TRACKS.find((t) => t.id === lesson.trackId);
  const isCompleted = completedLessonIds.includes(lesson.id);

  const [code, setCode] = useState(lesson.challenge.starterCode);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [testOutcomes, setTestOutcomes] = useState<Array<{ id: string; label: string; passed: boolean }> | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setCode(lesson.challenge.starterCode);
    setLastResult(null);
    setTestOutcomes(null);
    setShowHint(false);
  }, [lesson]);

  const handleLoadExample = (exampleCode: string) => {
    setCode(exampleCode);
    const res = executePython(exampleCode, { stdin: lesson.challenge.stdin });
    setLastResult(res);
    setTestOutcomes(null);
  };

  const handleVerifyChallenge = () => {
    const res = executePython(code, { stdin: lesson.challenge.stdin });
    setLastResult(res);

    const outcomes = lesson.challenge.tests.map((t) => ({
      id: t.id,
      label: t.label,
      passed: Boolean(t.check(res, code)),
    }));
    setTestOutcomes(outcomes);

    if (outcomes.every((o) => o.passed)) {
      onMarkCompleted(lesson.id);
    }
  };

  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  return (
    <div className="space-y-6">
      {/* Sub-toolbar for lesson navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBackToOverview}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            返回課程總覽
          </button>

          <span className="text-slate-300" aria-hidden="true">
            /
          </span>

          <label className="sr-only" htmlFor="lesson-switcher">
            切換課程單元
          </label>
          <select
            id="lesson-switcher"
            value={lesson.id}
            onChange={(e) => onSelectLesson(e.target.value)}
            className="text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.number}. {l.title} {completedLessonIds.includes(l.id) ? '(已完成)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={!prevLesson}
            onClick={() => prevLesson && onSelectLesson(prevLesson.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            上一課
          </button>
          <button
            type="button"
            disabled={!nextLesson}
            onClick={() => nextLesson && onSelectLesson(nextLesson.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
          >
            下一課
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Zone: Concept Explanation + Challenge */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">{track?.number}</span>
                <span aria-hidden="true">·</span>
                <span>第 {lesson.number} 課</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{lesson.duration}</span>
              </div>

              {isCompleted && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 whitespace-nowrap">
                  <CheckCircle2 className="w-4 h-4" />
                  已完成
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 leading-snug text-balance">
              {lesson.title}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">{lesson.summary}</p>
          </div>

          {/* Concept Sections */}
          <div className="space-y-4">
            {lesson.sections.map((sec, idx) => (
              <section
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
              >
                <h2 className="text-base font-bold text-slate-900">{sec.heading}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{sec.explanation}</p>

                <div className="rounded-lg border border-slate-200 overflow-hidden bg-[#0F172A]">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#0B1120] border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-400">範例程式碼</span>
                    <button
                      type="button"
                      onClick={() => handleLoadExample(sec.codeExample)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      載入至右側執行
                    </button>
                  </div>
                  <pre className="p-3.5 text-xs font-mono text-slate-100 leading-relaxed overflow-x-auto">
                    {sec.codeExample}
                  </pre>
                </div>

                {sec.note && (
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">{sec.note}</p>
                )}
              </section>
            ))}
          </div>

          {/* Interactive Coding Challenge */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-700" />
                <h2 className="text-base font-bold text-slate-900">{lesson.challenge.title}</h2>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.challenge.prompt}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleVerifyChallenge}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                執行並驗證答案
              </button>

              <button
                type="button"
                onClick={() => setShowHint((h) => !h)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                {showHint ? '隱藏提示' : '查看提示'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCode(lesson.challenge.solutionCode);
                  setTestOutcomes(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                填入參考解答
              </button>
            </div>

            {showHint && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                提示：{lesson.challenge.hint}
              </div>
            )}

            {testOutcomes && (
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-700">自動測試驗證結果</div>
                <div className="space-y-1.5">
                  {testOutcomes.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${
                        t.passed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span className="inline-flex items-center gap-1 font-semibold whitespace-nowrap shrink-0">
                        {t.passed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            通過
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-700" />
                            未通過
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {testOutcomes.every((t) => t.passed) && nextLesson && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectLesson(nextLesson.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                      <span>挑戰過關，前往下一課：{nextLesson.title}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Zone: Python Workbench */}
        <div className="lg:col-span-7 lg:sticky lg:top-6">
          <PythonWorkbench
            code={code}
            onChangeCode={(next) => setCode(next)}
            onResetCode={() => {
              setCode(lesson.challenge.starterCode);
              setLastResult(null);
              setTestOutcomes(null);
            }}
            stdin={lesson.challenge.stdin}
            lastResult={lastResult}
            onRunResult={setLastResult}
            minEditorHeightClass="min-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
}
