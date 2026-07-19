import { Link } from 'react-router-dom'
import type { Exercise } from '../data/types'
import ExerciseImg from './ExerciseImg'

export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-2.5 active:bg-slate-800"
    >
      <ExerciseImg
        src={exercise.image}
        alt={exercise.name}
        className="h-16 w-16 shrink-0 rounded-lg bg-white object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{exercise.name}</div>
        <div className="truncate text-xs text-slate-400">{exercise.nameEn}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-300">
            {exercise.targetZh}
          </span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
            {exercise.equipmentZh}
          </span>
        </div>
      </div>
    </Link>
  )
}
