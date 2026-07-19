import { useMemo, useState } from 'react'
import { searchExercises, useExercises } from '../data/exercises'
import type { Exercise } from '../data/types'
import ExerciseImg from './ExerciseImg'

/**
 * 全螢幕動作揀選器（計劃加動作、自訂機械關聯動作共用）。
 * multi = true 時可以剔多個，撳「完成」先回傳。
 */
export default function ExercisePicker({
  title,
  multi = false,
  initialQuery = '',
  excludeIds = [],
  onDone,
  onClose,
}: {
  title: string
  multi?: boolean
  initialQuery?: string
  excludeIds?: string[]
  onDone: (selected: Exercise[]) => void
  onClose: () => void
}) {
  const all = useExercises()
  const [query, setQuery] = useState(initialQuery)
  const [picked, setPicked] = useState<Map<string, Exercise>>(new Map())

  const results = useMemo(() => {
    if (!all) return []
    const excluded = new Set(excludeIds)
    return searchExercises(all, query)
      .filter((x) => !excluded.has(x.id))
      .slice(0, 80)
  }, [all, query, excludeIds])

  const toggle = (x: Exercise) => {
    if (!multi) {
      onDone([x])
      return
    }
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(x.id)) next.delete(x.id)
      else next.set(x.id, x)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-lg flex-col bg-slate-950">
      <header className="flex items-center gap-2 border-b border-slate-800 p-3">
        <button type="button" onClick={onClose} className="p-1 text-slate-400">
          ✕
        </button>
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {multi && (
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => onDone([...picked.values()])}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-40"
          >
            完成（{picked.size}）
          </button>
        )}
      </header>
      <div className="p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋動作（中英文都得）…"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          autoFocus
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-6">
        {!all && <p className="py-8 text-center text-sm text-slate-500">載入緊動作資料…</p>}
        {all && results.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">搵唔到相關動作</p>
        )}
        {results.map((x) => {
          const selected = picked.has(x.id)
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => toggle(x)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${
                selected ? 'border-emerald-500 bg-emerald-950/40' : 'border-slate-800 bg-slate-900'
              }`}
            >
              <ExerciseImg
                src={x.image}
                className="h-12 w-12 shrink-0 rounded-lg bg-white object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{x.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {x.nameEn} · {x.targetZh} · {x.equipmentZh}
                </div>
              </div>
              {multi && (
                <span
                  className={`text-lg ${selected ? 'text-emerald-400' : 'text-slate-600'}`}
                >
                  {selected ? '☑' : '☐'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
