import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useExercises } from '../data/exercises'
import { db } from '../db'
import type { Session } from '../db'

const PIE_COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171', '#38bdf8', '#a3e635', '#fb923c', '#94a3b8']

function volumeOf(s: Session) {
  return s.entries.reduce(
    (sum, e) => sum + e.sets.reduce((v, set) => v + set.weightKg * set.reps, 0),
    0,
  )
}

function fmtDate(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function HistoryPage() {
  const [tab, setTab] = useState<'log' | 'stats'>('log')
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), [])
  const all = useExercises()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [statExercise, setStatExercise] = useState<string | null>(null)

  const exName = (id: string) => all?.find((x) => x.id === id)?.name ?? '…'
  const exCategory = (id: string) => all?.find((x) => x.id === id)?.categoryZh ?? '其他'

  // ---- 統計數據 ----
  const weeklyVolume = useMemo(() => {
    if (!sessions) return []
    const weeks = new Map<string, number>()
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay() - i * 7 + 1) // 週一開始
      d.setHours(0, 0, 0, 0)
      weeks.set(`${d.getMonth() + 1}/${d.getDate()}`, 0)
    }
    for (const s of sessions) {
      const d = new Date(s.startedAt)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      d.setHours(0, 0, 0, 0)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      if (weeks.has(key)) weeks.set(key, weeks.get(key)! + volumeOf(s))
    }
    return [...weeks.entries()].map(([week, volume]) => ({ week, volume: Math.round(volume) }))
  }, [sessions])

  const categoryDist = useMemo(() => {
    if (!sessions || !all) return []
    const dist = new Map<string, number>()
    for (const s of sessions) {
      for (const e of s.entries) {
        const cat = exCategory(e.exerciseId)
        dist.set(cat, (dist.get(cat) ?? 0) + e.sets.length)
      }
    }
    return [...dist.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, all])

  const trainedExercises = useMemo(() => {
    if (!sessions) return []
    const ids = new Map<string, number>()
    for (const s of sessions)
      for (const e of s.entries) ids.set(e.exerciseId, (ids.get(e.exerciseId) ?? 0) + 1)
    return [...ids.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [sessions])

  const pickedStatExercise = statExercise ?? trainedExercises[0] ?? null
  const progressionData = useMemo(
    () => (sessions && pickedStatExercise ? progressionFor(sessions, pickedStatExercise) : []),
    [sessions, pickedStatExercise],
  )

  return (
    <div className="p-3">
      <h1 className="mb-3 text-lg font-bold">訓練紀錄</h1>
      <div className="mb-4 flex rounded-xl bg-slate-900 p-1">
        {(['log', 'stats'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              tab === t ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            {t === 'log' ? '紀錄' : '統計'}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="space-y-2">
          {sessions && sessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
              <p className="mb-1 text-sm text-slate-300">仲未有訓練紀錄</p>
              <p className="text-xs text-slate-500">完成第一次訓練之後，紀錄會顯示喺度。</p>
            </div>
          )}
          {(sessions ?? []).map((s) => {
            const isOpen = expanded === s.id
            const vol = Math.round(volumeOf(s))
            const totalSets = s.entries.reduce((n, e) => n + e.sets.length, 0)
            return (
              <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {s.planName ?? '空白訓練'}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {fmtDate(s.startedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {s.entries.length} 個動作 · {totalSets} 組 · 總容量 {vol.toLocaleString()} kg ·{' '}
                      {Math.round(s.durationSec / 60)} 分鐘
                    </div>
                  </div>
                  <span className="text-slate-500">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-slate-800 p-3">
                    {s.entries.map((e) => (
                      <div key={e.exerciseId}>
                        <div className="text-xs font-medium text-slate-200">
                          {exName(e.exerciseId)}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {e.sets.map((set, i) => (
                            <span key={i} className="mr-2">
                              {set.weightKg}kg×{set.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('刪除呢次訓練紀錄？')) db.sessions.delete(s.id)
                      }}
                      className="text-xs text-red-400"
                    >
                      刪除紀錄
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-5">
          {(!sessions || sessions.length === 0) && (
            <p className="py-8 text-center text-xs text-slate-500">有訓練紀錄之後先有統計。</p>
          )}
          {sessions && sessions.length > 0 && (
            <>
              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-300">每週訓練容量（kg）</h2>
                <div className="h-44 rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <ResponsiveContainer>
                    <BarChart data={weeklyVolume}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
                        formatter={(v) => [`${Number(v).toLocaleString()} kg`, '容量']}
                      />
                      <Bar dataKey="volume" fill="#34d399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-300">動作進步曲線</h2>
                <select
                  value={pickedStatExercise ?? ''}
                  onChange={(e) => setStatExercise(e.target.value)}
                  className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm"
                >
                  {trainedExercises.map((id) => (
                    <option key={id} value={id}>
                      {exName(id)}
                    </option>
                  ))}
                </select>
                <div className="h-44 rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <ResponsiveContainer>
                    <LineChart data={progressionData}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={34} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
                        formatter={(v, name) => [`${v} kg`, name === 'maxKg' ? '最大重量' : '估算 1RM']}
                      />
                      <Line type="monotone" dataKey="maxKg" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="e1rm" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  綠色實線＝最大重量；藍色虛線＝估算 1RM（Epley 公式）
                </p>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-300">訓練部位分佈（組數）</h2>
                <div className="h-52 rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryDist}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={2}
                        label={({ name, value }) => `${name} ${value}`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {categoryDist.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
                        formatter={(v) => [`${v} 組`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function progressionFor(sessions: Session[], exerciseId: string) {
  const points: { date: string; maxKg: number; e1rm: number }[] = []
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const entry = s.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry || entry.sets.length === 0) continue
    const maxKg = Math.max(...entry.sets.map((x) => x.weightKg))
    const e1rm = Math.max(...entry.sets.map((x) => x.weightKg * (1 + Math.min(x.reps, 12) / 30)))
    points.push({ date: fmtDate(s.startedAt), maxKg, e1rm: Math.round(e1rm * 10) / 10 })
  }
  return points
}
