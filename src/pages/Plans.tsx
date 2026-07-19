import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getActiveWorkout, setActiveWorkout } from '../db/activeWorkout'
import { useExercises } from '../data/exercises'
import type { Plan } from '../db'

export default function PlansPage() {
  const navigate = useNavigate()
  const plans = useLiveQuery(() => db.plans.orderBy('createdAt').toArray(), [])
  const all = useExercises()

  const createPlan = async () => {
    const name = prompt('計劃名稱（例如：推日、拉日、腿日）：')
    if (!name) return
    const id = await db.plans.add({ name, exercises: [], createdAt: Date.now() } as never)
    navigate(`/plans/${id}`)
  }

  const startWorkout = (plan: Plan) => {
    if (getActiveWorkout() && !confirm('有進行中嘅訓練，要放棄佢並開始新訓練？')) return
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
    navigate('/workout')
  }

  const exerciseName = (id: string) => all?.find((x) => x.id === id)?.name ?? '…'

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">訓練計劃</h1>
        <button
          type="button"
          onClick={createPlan}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
        >
          ＋ 新計劃
        </button>
      </div>

      {plans && plans.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
          <p className="mb-1 text-sm text-slate-300">仲未有訓練計劃</p>
          <p className="text-xs text-slate-500">
            建立一個計劃（例如推日／拉日／腿日），再由動作庫加入動作。
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(`/plans/${p.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">
                  {p.exercises.length === 0
                    ? '未有動作 — 撳入去編輯'
                    : p.exercises
                        .slice(0, 3)
                        .map((e) => exerciseName(e.exerciseId))
                        .join('、') + (p.exercises.length > 3 ? ` 等 ${p.exercises.length} 個` : '')}
                </div>
              </button>
              <button
                type="button"
                disabled={p.exercises.length === 0}
                onClick={() => startWorkout(p)}
                className="ml-2 shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40"
              >
                開始 ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
