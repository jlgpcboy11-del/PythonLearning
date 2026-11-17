import { useMemo, useState } from 'react';
import { Play, Search } from 'lucide-react';
import { CHEATSHEET_ITEMS, CheatsheetItem } from '../data/curriculum';

interface CheatsheetViewProps {
  onRunInSandbox: (code: string) => void;
}

const CATEGORIES: Array<{ id: 'all' | CheatsheetItem['category']; label: string }> = [
  { id: 'all', label: '全部語法' },
  { id: 'basics', label: '基礎與字串' },
  { id: 'control', label: '流程與函式' },
  { id: 'structures', label: '串列與字典' },
  { id: 'oop', label: '物件導向' },
];

export function CheatsheetView({ onRunInSandbox }: CheatsheetViewProps) {
  const [category, setCategory] = useState<'all' | CheatsheetItem['category']>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHEATSHEET_ITEMS.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.syntax.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Python 語法速查手冊</h1>
          <p className="text-sm text-slate-600 mt-1">
            快速檢索常用語法與高階技巧，任一項目皆可直接載入互動實驗室執行驗證。
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋語法或關鍵字..."
            aria-label="搜尋語法速查項目"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Category Filter Segmented Control */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              category === cat.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 bg-white border border-slate-200 rounded-xl text-center text-sm text-slate-500">
          找不到符合「{query}」的語法項目，請嘗試其他關鍵字。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col bg-white border border-slate-200 rounded-xl p-6 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">{item.categoryLabel}</span>
                <button
                  type="button"
                  onClick={() => onRunInSandbox(item.example)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  在實驗室執行
                </button>
              </div>

              <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
              <div className="font-mono text-xs text-blue-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 w-fit">
                {item.syntax}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>

              <pre className="mt-auto p-3.5 rounded-lg bg-[#0F172A] text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
                {item.example}
              </pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
