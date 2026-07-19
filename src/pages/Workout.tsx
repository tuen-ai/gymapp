import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import ExerciseImg from '../components/ExerciseImg'
import ExercisePicker from '../components/ExercisePicker'
import { useExercises } from '../data/exercises'
import { db } from '../db'
import {
  setActiveWorkout,
  updateActiveWorkout,
  useActiveWorkout,
} from '../db/activeWorkout'
import type { Plan } from '../db'

const REST_SECONDS = 90

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function WorkoutPage() {
  const workout = useActiveWorkout()
  const navigate = useNavigate()
  const all = useExercises()
  const plans = useLiveQuery(() => db.plans.orderBy('createdAt').toArray(), [])
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('startedAt').reverse().limit(50).toArray(),
    [],
  )
  const [now, setNow] = useState(Date.now())
  const [restEnd, setRestEnd] = useState<number | null>(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // 每個動作上次做嘅紀錄（自動帶入 placeholder）
  const lastSets = useMemo(() => {
    const map = new Map<string, { weightKg: number; reps: number }>()
    for (const s of sessions ?? []) {
      for (const e of s.entries) {
        if (!map.has(e.exerciseId) && e.sets.length > 0) {
          const best = e.sets[e.sets.length - 1]
          map.set(e.exerciseId, best)
        }
      }
    }
    return map
  }, [sessions])

  const startBlank = () => {
    setActiveWorkout({ startedAt: Date.now(), entries: [] })
  }

  const startFromPlan = (plan: Plan) => {
    setActiveWorkout({
      planId: plan.id,
      planName: plan.name,
      startedAt: Date.now(),
      entries: plan.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        sets: Array.from({ length: e.targetSets }, () => ({
          weightKg: null,
          reps: null,
          done: false,
        })),
      })),
    })
  }

  // ---------- 未開始畫面 ----------
  if (!workout) {
    return (
      <div className="p-3">
        <h1 className="mb-3 text-lg font-bold">開始訓練</h1>
        <button
          type="button"
          onClick={startBlank}
          className="mb-4 w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-slate-950"
        >
          ▶ 開始空白訓練
        </button>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">或者由計劃開始</h2>
        <div className="space-y-2">
          {(plans ?? [])
            .filter((p) => p.exercises.length > 0)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => startFromPlan(p)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm"
              >
                {p.name}
                <span className="text-xs text-slate-400">{p.exercises.length} 個動作 ▶</span>
              </button>
            ))}
          {plans && plans.filter((p) => p.exercises.length > 0).length === 0 && (
            <p className="text-xs text-slate-500">未有計劃 — 去「計劃」tab 建立一個。</p>
          )}
        </div>
      </div>
    )
  }

  // ---------- 進行中畫面 ----------
  const elapsed = Math.floor((now - workout.startedAt) / 1000)
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : null
  const ex = (eid: string) => all?.find((x) => x.id === eid)

  const setSetValue = (
    entryIdx: number,
    setIdx: number,
    field: 'weightKg' | 'reps',
    value: string,
  ) => {
    updateActiveWorkout((w) => {
      const next = structuredClone(w)
      next.entries[entryIdx].sets[setIdx][field] = value === '' ? null : Number(value)
      return next
    })
  }

  const toggleDone = (entryIdx: number, setIdx: number) => {
    let becameDone = false
    updateActiveWorkout((w) => {
      const next = structuredClone(w)
      const set = next.entries[entryIdx].sets[setIdx]
      // 撳完成時，如果無填數值就用上次紀錄／目標值帶入
      if (!set.done) {
        const eid = next.entries[entryIdx].exerciseId
        const last = lastSets.get(eid)
        if (set.weightKg == null) set.weightKg = last?.weightKg ?? 0
        if (set.reps == null) set.reps = last?.reps ?? next.entries[entryIdx].targetReps
        becameDone = true
      }
      set.done = !set.done
      return next
    })
    if (becameDone) setRestEnd(Date.now() + REST_SECONDS * 1000)
  }

  const finish = async () => {
    const entries = workout.entries
      .map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets
          .filter((s) => s.done && s.reps != null)
          .map((s) => ({ weightKg: s.weightKg ?? 0, reps: s.reps ?? 0 })),
      }))
      .filter((e) => e.sets.length > 0)
    if (entries.length === 0) {
      if (!confirm('未記錄任何組數，直接放棄呢次訓練？')) return
      setActiveWorkout(null)
      return
    }
    await db.sessions.add({
      planId: workout.planId,
      planName: workout.planName,
      startedAt: workout.startedAt,
      durationSec: elapsed,
      entries,
    } as never)
    setActiveWorkout(null)
    setRestEnd(null)
    navigate('/history')
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
        <div className="flex-1">
          <h1 className="text-base font-bold">{workout.planName ?? '空白訓練'}</h1>
          <p className="text-xs text-emerald-400">⏱ {fmtDuration(elapsed)}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('放棄呢次訓練？所有未儲存紀錄會消失。')) {
              setActiveWorkout(null)
              setRestEnd(null)
            }
          }}
          className="text-xs text-red-400"
        >
          放棄
        </button>
        <button
          type="button"
          onClick={finish}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
        >
          完成 ✓
        </button>
      </header>

      <div className="space-y-3 p-3">
        {workout.entries.map((entry, ei) => {
          const x = ex(entry.exerciseId)
          const last = lastSets.get(entry.exerciseId)
          return (
            <div key={`${entry.exerciseId}-${ei}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="mb-2 flex items-center gap-2">
                <ExerciseImg
                  src={x?.image}
                  className="h-11 w-11 shrink-0 rounded-lg bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{x?.name ?? '…'}</div>
                  <div className="text-xs text-slate-500">
                    目標 {entry.targetSets} 組 × {entry.targetReps} 次
                    {last && ` ・上次 ${last.weightKg}kg × ${last.reps}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveWorkout((w) => {
                      const next = structuredClone(w)
                      next.entries.splice(ei, 1)
                      return next
                    })
                  }
                  className="px-1 text-sm text-red-400"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-center text-[10px] text-slate-500">
                  <span>組</span>
                  <span>重量 (kg)</span>
                  <span>次數</span>
                  <span>✓</span>
                </div>
                {entry.sets.map((s, si) => (
                  <div key={si} className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2">
                    <span className="text-center text-xs text-slate-400">{si + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={s.weightKg ?? ''}
                      placeholder={String(last?.weightKg ?? 0)}
                      onChange={(e) => setSetValue(ei, si, 'weightKg', e.target.value)}
                      className={`w-full min-w-0 rounded-lg border px-2 py-2 text-center text-sm ${
                        s.done
                          ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={s.reps ?? ''}
                      placeholder={String(last?.reps ?? entry.targetReps)}
                      onChange={(e) => setSetValue(ei, si, 'reps', e.target.value)}
                      className={`w-full min-w-0 rounded-lg border px-2 py-2 text-center text-sm ${
                        s.done
                          ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleDone(ei, si)}
                      className={`rounded-lg py-2 text-sm font-bold ${
                        s.done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    updateActiveWorkout((w) => {
                      const next = structuredClone(w)
                      next.entries[ei].sets.push({ weightKg: null, reps: null, done: false })
                      return next
                    })
                  }
                  className="text-emerald-400"
                >
                  ＋ 加一組
                </button>
                {entry.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveWorkout((w) => {
                        const next = structuredClone(w)
                        next.entries[ei].sets.pop()
                        return next
                      })
                    }
                    className="text-slate-500"
                  >
                    － 減一組
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full rounded-xl border border-dashed border-emerald-700 py-3 text-sm text-emerald-400"
        >
          ＋ 加入動作
        </button>
      </div>

      {restLeft !== null && restLeft > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-lg px-3 pb-2">
          <div className="flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
            <span>組間休息 {fmtDuration(restLeft)}</span>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => setRestEnd((restEnd ?? now) + 30000)}>
                +30秒
              </button>
              <button type="button" onClick={() => setRestEnd(null)}>
                跳過
              </button>
            </div>
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          title="加入動作"
          multi
          excludeIds={workout.entries.map((e) => e.exerciseId)}
          onDone={(selected) => {
            updateActiveWorkout((w) => {
              const next = structuredClone(w)
              next.entries.push(
                ...selected.map((x) => ({
                  exerciseId: x.id,
                  targetSets: 3,
                  targetReps: 10,
                  sets: Array.from({ length: 3 }, () => ({
                    weightKg: null,
                    reps: null,
                    done: false,
                  })),
                })),
              )
              return next
            })
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
