import { useState } from 'react';
import { SANDBOX_PRESETS } from '../data/curriculum';
import { ExecutionResult, executePython } from '../lib/pythonEngine';
import { PythonWorkbench } from './PythonWorkbench';

interface SandboxViewProps {
  initialCode?: string;
}

export function SandboxView({ initialCode }: SandboxViewProps) {
  const defaultPreset = SANDBOX_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    initialCode ? null : defaultPreset.id
  );
  const [code, setCode] = useState<string>(initialCode ?? defaultPreset.code);
  const [stdin, setStdin] = useState<string>('');
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(() =>
    executePython(initialCode ?? defaultPreset.code)
  );

  const handleSelectPreset = (presetId: string) => {
    const preset = SANDBOX_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setCode(preset.code);
    setStdin(preset.stdin || '');
    setLastResult(executePython(preset.code, { stdin: preset.stdin || '' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">互動 Python 實驗室</h1>
          <p className="text-sm text-slate-600 mt-1">
            自由撰寫 Python 腳本，或載入下方演算法範例，點擊「單步透視」觀察記憶體與呼叫堆疊變化。
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowStdin((s) => !s)}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {showStdin ? '隱藏標準輸入 (stdin)' : '設定標準輸入 (stdin)'}
        </button>
      </div>

      {/* Preset Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SANDBOX_PRESETS.map((preset) => {
          const isActive = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-50/70 border-blue-600'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs text-slate-500 mb-1">{preset.category}</div>
              <div className="text-sm font-bold text-slate-900 mb-1">{preset.title}</div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      <PythonWorkbench
        code={code}
        onChangeCode={(next) => {
          setCode(next);
          setSelectedPresetId(null);
        }}
        onResetCode={() => {
          const fallback =
            SANDBOX_PRESETS.find((p) => p.id === selectedPresetId)?.code ?? defaultPreset.code;
          setCode(fallback);
          setLastResult(executePython(fallback, { stdin }));
        }}
        stdin={stdin}
        onChangeStdin={setStdin}
        showStdin={showStdin}
        lastResult={lastResult}
        onRunResult={setLastResult}
        minEditorHeightClass="min-h-[340px]"
      />
    </div>
  );
}
