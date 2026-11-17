import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  RotateCcw,
  StepForward,
  ChevronLeft,
  ChevronRight,
  Pause,
  Terminal,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ExecutionResult, TraceStep, executePython } from '../lib/pythonEngine';

interface PythonWorkbenchProps {
  code: string;
  onChangeCode: (next: string) => void;
  onResetCode?: () => void;
  stdin?: string;
  onChangeStdin?: (next: string) => void;
  showStdin?: boolean;
  lastResult: ExecutionResult | null;
  onRunResult: (result: ExecutionResult) => void;
  minEditorHeightClass?: string;
}

export function PythonWorkbench({
  code,
  onChangeCode,
  onResetCode,
  stdin = '',
  onChangeStdin,
  showStdin = false,
  lastResult,
  onRunResult,
  minEditorHeightClass = 'min-h-[260px]',
}: PythonWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'visualizer'>('console');
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumRef = useRef<HTMLDivElement | null>(null);

  const lines = useMemo(() => code.split('\n'), [code]);

  const currentStep: TraceStep | null = useMemo(() => {
    if (!lastResult || lastResult.steps.length === 0) return null;
    const clamped = Math.max(0, Math.min(stepIdx, lastResult.steps.length - 1));
    return lastResult.steps[clamped];
  }, [lastResult, stepIdx]);

  useEffect(() => {
    if (!isPlaying || !lastResult || lastResult.steps.length === 0) return;
    if (stepIdx >= lastResult.steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setInterval(() => {
      setStepIdx((prev) => {
        if (prev >= lastResult.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [isPlaying, stepIdx, lastResult]);

  const handleRun = (switchToVisualizer = false) => {
    setIsPlaying(false);
    const res = executePython(code, { stdin });
    onRunResult(res);
    setStepIdx(0);
    if (switchToVisualizer) {
      setActiveTab('visualizer');
    } else {
      setActiveTab('console');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun(activeTab === 'visualizer');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = code.slice(0, start) + '    ' + code.slice(end);
      onChangeCode(updated);
      window.requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 4;
          textareaRef.current.selectionEnd = start + 4;
        }
      });
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const activeVisualLine = activeTab === 'visualizer' && currentStep ? currentStep.line : null;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">Python 編輯器</span>
          <span className="hidden sm:inline text-xs text-slate-500 whitespace-nowrap">
            Ctrl + Enter 快速執行
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onResetCode && (
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onResetCode();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重設
            </button>
          )}
          <button
            type="button"
            onClick={() => handleRun(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <StepForward className="w-3.5 h-3.5 text-blue-700" />
            單步透視
          </button>
          <button
            type="button"
            onClick={() => handleRun(false)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            執行程式
          </button>
        </div>
      </div>

      {/* Code Editor Surface */}
      <div className={`relative flex bg-[#0F172A] text-slate-100 font-mono text-sm leading-6 ${minEditorHeightClass}`}>
        <div
          ref={lineNumRef}
          aria-hidden="true"
          className="select-none py-4 px-3 text-right text-slate-500 bg-[#0B1120] border-r border-slate-800 overflow-hidden tabular-nums min-w-[3rem]"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isActive = activeVisualLine === lineNum;
            return (
              <div
                key={lineNum}
                className={`leading-6 px-1 rounded ${
                  isActive ? 'bg-amber-500/25 text-amber-300 font-semibold' : ''
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        <div className="relative flex-1 overflow-hidden">
          {activeVisualLine !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 bg-amber-400/10 border-y border-amber-400/30 transition-transform duration-150"
              style={{
                height: '24px',
                transform: `translateY(${16 + (activeVisualLine - 1) * 24}px)`,
              }}
            />
          )}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Python 程式碼編輯區"
            className="code-editor relative z-10 w-full h-full min-h-[260px] p-4 bg-transparent text-slate-100 resize-y focus:outline-none leading-6 font-mono text-sm caret-blue-400"
          />
        </div>
      </div>

      {/* Optional Standard Input */}
      {showStdin && onChangeStdin && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            標準輸入資料 (供 input() 依序讀取，每行一筆)
          </label>
          <textarea
            rows={2}
            value={stdin}
            onChange={(e) => onChangeStdin(e.target.value)}
            placeholder="例如：&#10;Alex&#10;25"
            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      )}

      {/* Output / Visualizer Tabs */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('console')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'console'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            終端輸出
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visualizer')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'visualizer'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            記憶體與執行透視
          </button>
        </div>

        {lastResult && (
          <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums whitespace-nowrap">
            {lastResult.success ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                執行完成
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                執行發生錯誤
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{lastResult.durationMs} ms</span>
          </div>
        )}
      </div>

      {/* Tab Body */}
      <div className="p-4 bg-white min-h-[210px]">
        {!lastResult ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
            <p className="text-sm font-medium text-slate-700 mb-1">尚未執行程式碼</p>
            <p className="text-xs text-slate-500">
              點擊上方「執行程式」查看輸出，或選擇「單步透視」追蹤每行變數變化。
            </p>
          </div>
        ) : activeTab === 'console' ? (
          <div className="space-y-3">
            {lastResult.output ? (
              <pre className="p-3.5 rounded-lg bg-[#0F172A] text-slate-100 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {lastResult.output}
              </pre>
            ) : (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono">
                （程式執行完畢，無任何 print() 輸出內容）
              </div>
            )}

            {lastResult.error && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900">
                <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                  <span>
                    第 {lastResult.error.line} 行 · {lastResult.error.type}
                  </span>
                </div>
                <p className="text-xs text-red-800 font-mono">{lastResult.error.message}</p>
              </div>
            )}
          </div>
        ) : lastResult.steps.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            {lastResult.error
              ? `第 ${lastResult.error.line} 行語法錯誤（${lastResult.error.type}）：${lastResult.error.message}`
              : '沒有可追蹤的執行步驟。'}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIdx(0);
                  }}
                  disabled={stepIdx === 0}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  首步
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIdx((p) => Math.max(0, p - 1));
                  }}
                  disabled={stepIdx === 0}
                  aria-label="上一步"
                  className="p-1.5 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 cursor-pointer whitespace-nowrap"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? '暫停' : '播放'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIdx((p) => Math.min(lastResult.steps.length - 1, p + 1));
                  }}
                  disabled={stepIdx >= lastResult.steps.length - 1}
                  aria-label="下一步"
                  className="p-1.5 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
                <span>
                  步驟 {stepIdx + 1} / {lastResult.steps.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-amber-700">第 {currentStep?.line} 行</span>
              </div>
            </div>

            {/* Step Scrubber */}
            <div>
              <label className="sr-only" htmlFor="step-slider">
                執行步驟進度滑桿
              </label>
              <input
                id="step-slider"
                type="range"
                min={0}
                max={Math.max(0, lastResult.steps.length - 1)}
                value={stepIdx}
                onChange={(e) => {
                  setIsPlaying(false);
                  setStepIdx(Number(e.target.value));
                }}
                className="w-full accent-blue-700 cursor-pointer"
              />
            </div>

            {/* Current Step Annotation */}
            {currentStep && (
              <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-800">{currentStep.annotation}</span>
                <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                  Line {currentStep.line}
                </span>
              </div>
            )}

            {/* Memory Variables & Call Stack Split */}
            {currentStep && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Global Variables Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    全域記憶體變數 ({currentStep.globals.length})
                  </div>
                  {currentStep.globals.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">目前尚無全域變數</div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                      {currentStep.globals.map((v) => (
                        <div
                          key={v.name}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-slate-900 truncate">{v.name}</span>
                            <span className="text-slate-400">{v.type}</span>
                          </div>
                          <span className="text-blue-800 truncate max-w-[180px]" title={v.value}>
                            {v.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Call Stack & Partial Output */}
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                      函式呼叫堆疊 ({currentStep.callStack.length})
                    </div>
                    {currentStep.callStack.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">位於主程式全域作用域 (&lt;module&gt;)</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[130px] overflow-y-auto">
                        {currentStep.callStack.map((frame, i) => (
                          <div key={`${frame.functionName}-${i}`} className="p-2.5 text-xs">
                            <div className="font-mono font-semibold text-slate-900 mb-1">
                              {frame.functionName}() · 第 {frame.line} 行呼叫
                            </div>
                            {frame.locals.length > 0 && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-slate-600">
                                {frame.locals.map((loc) => (
                                  <span key={loc.name}>
                                    {loc.name}={loc.value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                      截至此步驟的終端輸出
                    </div>
                    <pre className="p-3 text-xs font-mono text-slate-800 bg-white max-h-[90px] overflow-y-auto whitespace-pre-wrap">
                      {currentStep.outputSoFar || '（尚未產生輸出）'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
