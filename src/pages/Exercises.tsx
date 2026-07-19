import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Chip from '../components/Chip'
import ExerciseCard from '../components/ExerciseCard'
import { CATEGORY_ORDER, searchExercises, useExercises } from '../data/exercises'
import { db } from '../db'

const PAGE = 60

export default function ExercisesPage() {
  const all = useExercises()
  const machines = useLiveQuery(() => db.gymMachines.toArray(), [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [gymOnly, setGymOnly] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  const categories = useMemo(() => {
    if (!all) return []
    const map = new Map<string, string>()
    for (const x of all) map.set(x.category, x.categoryZh)
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ key: c, label: map.get(c)! }))
  }, [all])

  const equipments = useMemo(() => {
    if (!all) return []
    const count = new Map<string, { label: string; n: number }>()
    for (const x of all) {
      const cur = count.get(x.equipment)
      if (cur) cur.n++
      else count.set(x.equipment, { label: x.equipmentZh, n: 1 })
    }
    return [...count.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .map(([key, v]) => ({ key, label: v.label }))
  }, [all])

  // 我的健身房可以做嘅動作：徒手 + 已登記器材 + 自訂機械關聯動作
  const gymExerciseFilter = useMemo(() => {
    if (!machines) return null
    const equipmentKeys = new Set(
      machines.filter((m) => m.kind === 'preset' && m.equipmentKey).map((m) => m.equipmentKey!),
    )
    equipmentKeys.add('body weight')
    const linkedIds = new Set(machines.flatMap((m) => m.linkedExerciseIds))
    return { equipmentKeys, linkedIds }
  }, [machines])

  const results = useMemo(() => {
    if (!all) return []
    let list = searchExercises(all, query)
    if (category) list = list.filter((x) => x.category === category)
    if (equipment) list = list.filter((x) => x.equipment === equipment)
    if (gymOnly && gymExerciseFilter) {
      list = list.filter(
        (x) =>
          gymExerciseFilter.equipmentKeys.has(x.equipment) || gymExerciseFilter.linkedIds.has(x.id),
      )
    }
    return list
  }, [all, query, category, equipment, gymOnly, gymExerciseFilter])

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
        <h1 className="mb-2 text-lg font-bold">動作庫</h1>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE)
          }}
          placeholder="搜尋 1,324 個動作（中英文都得）…"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <div className="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          <Chip
            label="全部部位"
            active={category === null}
            onClick={() => {
              setCategory(null)
              setLimit(PAGE)
            }}
          />
          {categories.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              active={category === c.key}
              onClick={() => {
                setCategory(category === c.key ? null : c.key)
                setLimit(PAGE)
              }}
            />
          ))}
        </div>
        <div className="-mx-3 mt-1.5 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          <Chip
            label={`只顯示我健身房做到 ${gymOnly ? '✓' : ''}`}
            active={gymOnly}
            onClick={() => {
              setGymOnly(!gymOnly)
              setLimit(PAGE)
            }}
          />
          {equipments.map((e) => (
            <Chip
              key={e.key}
              label={e.label}
              active={equipment === e.key}
              onClick={() => {
                setEquipment(equipment === e.key ? null : e.key)
                setLimit(PAGE)
              }}
            />
          ))}
        </div>
      </header>

      <div className="space-y-2 p-3">
        {!all && <p className="py-10 text-center text-sm text-slate-500">載入緊動作資料…</p>}
        {all && (
          <p className="text-xs text-slate-500">共 {results.length} 個動作</p>
        )}
        {results.slice(0, limit).map((x) => (
          <ExerciseCard key={x.id} exercise={x} />
        ))}
        {results.length > limit && (
          <button
            type="button"
            onClick={() => setLimit(limit + PAGE)}
            className="w-full rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300"
          >
            載入更多（仲有 {results.length - limit} 個）
          </button>
        )}
      </div>
    </div>
  )
}
