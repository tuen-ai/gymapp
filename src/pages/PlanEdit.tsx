import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import ExerciseImg from '../components/ExerciseImg'
import ExercisePicker from '../components/ExercisePicker'
import { useExercises } from '../data/exercises'
import { db, type Plan } from '../db'

export default function PlanEditPage() {
  const { id } = useParams()
  const planId = Number(id)
  const navigate = useNavigate()
  const plan = useLiveQuery(() => db.plans.get(planId), [planId])
  const all = useExercises()
  const [picking, setPicking] = useState(false)

  if (!plan) return <p className="py-10 text-center text-sm text-slate-500">載入緊…</p>

  const ex = (eid: string) => all?.find((x) => x.id === eid)

  const update = (fn: (p: Plan) => void) => {
    fn(plan)
    db.plans.put(plan)
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= plan.exercises.length) return
    update((p) => {
      const arr = p.exercises
      ;[arr[index], arr[j]] = [arr[j], arr[index]]
    })
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
        <button type="button" onClick={() => navigate('/plans')} className="p-1 text-slate-400">
          ←
        </button>
        <h1 className="flex-1 truncate text-base font-bold">{plan.name}</h1>
        <button
          type="button"
          onClick={() => {
            const name = prompt('計劃名稱：', plan.name)
            if (name) update((p) => (p.name = name))
          }}
          className="text-xs text-slate-400"
        >
          改名
        </button>
        <button
          type="button"
          onClick={async () => {
            if (confirm(`刪除計劃「${plan.name}」？`)) {
              await db.plans.delete(planId)
              navigate('/plans')
            }
          }}
          className="text-xs text-red-400"
        >
          刪除
        </button>
      </header>

      <div className="space-y-2 p-3">
        {plan.exercises.map((e, i) => {
          const x = ex(e.exerciseId)
          return (
            <div key={e.exerciseId} className="rounded-xl border border-slate-800 bg-slate-900 p-2.5">
              <div className="flex items-center gap-2">
                <ExerciseImg
                  src={x?.image}
                  className="h-12 w-12 shrink-0 rounded-lg bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{x?.name ?? '…'}</div>
                  <div className="truncate text-xs text-slate-500">{x?.targetZh}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="px-1 text-xs text-slate-400">
                    ▲
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="px-1 text-xs text-slate-400">
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => update((p) => void p.exercises.splice(i, 1))}
                  className="px-1 text-sm text-red-400"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-1.5">
                  組數
                  <input
                    type="number"
                    min={1}
                    value={e.targetSets}
                    onChange={(ev) =>
                      update((p) => (p.exercises[i].targetSets = Math.max(1, Number(ev.target.value) || 1)))
                    }
                    className="w-14 min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-center"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  目標次數
                  <input
                    type="number"
                    min={1}
                    value={e.targetReps}
                    onChange={(ev) =>
                      update((p) => (p.exercises[i].targetReps = Math.max(1, Number(ev.target.value) || 1)))
                    }
                    className="w-14 min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-center"
                  />
                </label>
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

      {picking && (
        <ExercisePicker
          title={`加動作到「${plan.name}」`}
          multi
          excludeIds={plan.exercises.map((e) => e.exerciseId)}
          onDone={(selected) => {
            update((p) =>
              p.exercises.push(
                ...selected.map((x) => ({ exerciseId: x.id, targetSets: 3, targetReps: 10 })),
              ),
            )
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
