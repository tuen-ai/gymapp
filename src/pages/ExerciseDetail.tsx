import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import ExerciseImg from '../components/ExerciseImg'
import { useExercise } from '../data/exercises'
import { db } from '../db'

export default function ExerciseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const exercise = useExercise(id)
  const [showAddToPlan, setShowAddToPlan] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const plans = useLiveQuery(() => db.plans.toArray(), [])

  if (exercise === null) {
    return <p className="py-10 text-center text-sm text-slate-500">載入緊…</p>
  }
  if (!exercise) {
    return <p className="py-10 text-center text-sm text-slate-500">搵唔到呢個動作</p>
  }

  const addToPlan = async (planId: number) => {
    const plan = await db.plans.get(planId)
    if (!plan) return
    if (!plan.exercises.some((e) => e.exerciseId === exercise.id)) {
      plan.exercises.push({ exerciseId: exercise.id, targetSets: 3, targetReps: 10 })
      await db.plans.put(plan)
    }
    setAdded(plan.name)
    setShowAddToPlan(false)
    setTimeout(() => setAdded(null), 2000)
  }

  const createPlanWith = async () => {
    const name = prompt('新計劃名稱：', '我的訓練計劃')
    if (!name) return
    await db.plans.add({
      name,
      exercises: [{ exerciseId: exercise.id, targetSets: 3, targetReps: 10 }],
      createdAt: Date.now(),
    } as never)
    setShowAddToPlan(false)
    setAdded(name)
    setTimeout(() => setAdded(null), 2000)
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-slate-400">
          ←
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold">{exercise.name}</h1>
          <p className="truncate text-xs text-slate-400">{exercise.nameEn}</p>
        </div>
      </header>

      <div className="space-y-4 p-3">
        <div className="overflow-hidden rounded-2xl bg-white">
          <ExerciseImg
            src={exercise.gif}
            alt={`${exercise.name} 示範`}
            loading="eager"
            className="mx-auto w-full max-w-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs text-emerald-300">
            目標：{exercise.targetZh}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            部位：{exercise.categoryZh}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            器材：{exercise.equipmentZh}
          </span>
          {exercise.secondary.map((m) => (
            <span key={m} className="rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
              次要：{m}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddToPlan(true)}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-slate-950 active:bg-emerald-400"
        >
          ＋ 加入訓練計劃
        </button>
        {added && (
          <p className="text-center text-xs text-emerald-400">已加入「{added}」</p>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">動作步驟</h2>
          <ol className="space-y-2">
            {exercise.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl bg-slate-900 p-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-xs font-bold text-emerald-300">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        <p className="pb-4 text-center text-[10px] text-slate-600">
          動作示範媒體 © Gym visual — gymvisual.com
        </p>
      </div>

      {showAddToPlan && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setShowAddToPlan(false)}
        >
          <div
            className="pb-safe w-full max-w-lg rounded-t-2xl bg-slate-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold">加入邊個計劃？</h3>
            <div className="space-y-2">
              {(plans ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToPlan(p.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm"
                >
                  {p.name}
                  <span className="text-xs text-slate-400">{p.exercises.length} 個動作</span>
                </button>
              ))}
              <button
                type="button"
                onClick={createPlanWith}
                className="w-full rounded-xl border border-dashed border-emerald-700 px-3 py-2.5 text-sm text-emerald-400"
              >
                ＋ 建立新計劃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
