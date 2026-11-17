import { useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { LESSONS, QUIZ_QUESTIONS } from '../data/curriculum';

interface QuizViewProps {
  bestScore: number | null;
  onFinishQuiz: (score: number) => void;
  onReviewLesson: (lessonId: string) => void;
}

export function QuizView({ bestScore, onFinishQuiz, onReviewLesson }: QuizViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; chosen: number; correct: boolean }>>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[currentIdx];
  const hasSubmittedCurrent = selectedOption !== null;
  const isCurrentCorrect = selectedOption === currentQuestion.correctIndex;

  const handleSelectOption = (idx: number) => {
    if (hasSubmittedCurrent) return;
    setSelectedOption(idx);
    const correct = idx === currentQuestion.correctIndex;
    setAnswers((prev) => [...prev, { questionId: currentQuestion.id, chosen: idx, correct }]);
  };

  const handleNext = () => {
    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx((p) => p + 1);
      setSelectedOption(null);
    } else {
      const totalCorrect = answers.filter((a) => a.correct).length;
      setIsFinished(true);
      onFinishQuiz(totalCorrect);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswers([]);
    setIsFinished(false);
  };

  if (isFinished) {
    const score = answers.filter((a) => a.correct).length;
    const accuracy = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    const missedQuestions = QUIZ_QUESTIONS.filter((q) => {
      const ans = answers.find((a) => a.questionId === q.id);
      return ans && !ans.correct;
    });

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">隨堂測驗總結</div>
              <h1 className="text-2xl font-bold text-slate-900">測驗完成</h1>
            </div>

            <div className="text-right tabular-nums">
              <div className="text-3xl font-bold text-blue-700">
                {score} / {QUIZ_QUESTIONS.length}
              </div>
              <div className="text-xs text-slate-500">正確率 {accuracy}%</div>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {score >= 8
              ? '表現非常穩健，你已經對 Python 的核心資料型別、流程控制與結構化思維具備良好掌握度。'
              : '建議針對下方答錯的題目回到對應課程單元操作單步執行透視，能更快釐清變數與執行順序。'}
          </p>

          {missedQuestions.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-slate-900">建議複習單元</h2>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {missedQuestions.map((mq) => {
                  const lesson = LESSONS.find((l) => l.id === mq.relatedLessonId);
                  return (
                    <div
                      key={mq.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-4 bg-white"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{mq.question}</div>
                        <div className="text-xs text-slate-500 mt-1">{mq.explanation}</div>
                      </div>
                      {lesson && (
                        <button
                          type="button"
                          onClick={() => onReviewLesson(lesson.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>複習第 {lesson.number} 課</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              重新開始測驗
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Python 觀念隨堂測驗</h1>
          <p className="text-sm text-slate-600 mt-1">
            共 10 題核心觀念與執行輸出判讀，即時檢驗學習成果。
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span>
            第 {currentIdx + 1} / {QUIZ_QUESTIONS.length} 題
          </span>
          {bestScore !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>歷史最高 {bestScore} 分</span>
            </>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-700 transition-transform duration-200 origin-left"
          style={{ width: `${((currentIdx + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 leading-snug">{currentQuestion.question}</h2>

        {currentQuestion.code && (
          <pre className="p-4 rounded-lg bg-[#0F172A] text-slate-100 font-mono text-sm leading-relaxed overflow-x-auto">
            {currentQuestion.code}
          </pre>
        )}

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQuestion.correctIndex;

            let borderClass = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';
            if (hasSubmittedCurrent) {
              if (isCorrect) {
                borderClass = 'border-emerald-600 bg-emerald-50 text-emerald-950';
              } else if (isSelected && !isCorrect) {
                borderClass = 'border-red-600 bg-red-50 text-red-950';
              } else {
                borderClass = 'border-slate-200 bg-slate-50 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={hasSubmittedCurrent}
                onClick={() => handleSelectOption(idx)}
                className={`w-full px-4 py-3.5 rounded-lg border text-left flex items-center justify-between gap-4 transition-colors cursor-pointer disabled:cursor-default ${borderClass}`}
              >
                <span className="text-sm font-medium font-mono">{option}</span>
                {hasSubmittedCurrent && isCorrect && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    正確答案
                  </span>
                )}
                {hasSubmittedCurrent && isSelected && !isCorrect && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 shrink-0">
                    <XCircle className="w-4 h-4" />
                    你的選擇
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {hasSubmittedCurrent && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div
              className={`p-4 rounded-lg border text-sm leading-relaxed ${
                isCurrentCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="font-semibold mb-1">
                {isCurrentCorrect ? '回答正確' : '觀念解析'}
              </div>
              <p className="text-xs leading-relaxed">{currentQuestion.explanation}</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
              >
                <span>{currentIdx < QUIZ_QUESTIONS.length - 1 ? '下一題' : '查看測驗結果'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
