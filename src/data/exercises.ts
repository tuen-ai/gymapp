import { useEffect, useState } from 'react'
import type { Exercise } from './types'

let cache: Exercise[] | null = null
let pending: Promise<Exercise[]> | null = null

export function loadExercises(): Promise<Exercise[]> {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = fetch('/data/exercises.json')
      .then((r) => {
        if (!r.ok) throw new Error(`載入動作資料失敗（HTTP ${r.status}）`)
        return r.json()
      })
      .then((data: Exercise[]) => {
        cache = data
        return data
      })
  }
  return pending
}

/** 讀取全部動作（載入中回傳 null） */
export function useExercises(): Exercise[] | null {
  const [list, setList] = useState<Exercise[] | null>(cache)
  useEffect(() => {
    if (!cache) loadExercises().then(setList)
  }, [])
  return list
}

export function useExercise(id: string | undefined): Exercise | null | undefined {
  const list = useExercises()
  if (!list) return null // 載入中
  return list.find((x) => x.id === id) // undefined = 搵唔到
}

/** 簡易模糊搜尋：繁中名、英文名、肌群、器材都搵 */
export function searchExercises(list: Exercise[], query: string): Exercise[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const terms = q.split(/\s+/)
  return list.filter((x) => {
    const hay =
      `${x.name} ${x.nameEn} ${x.targetZh} ${x.target} ${x.equipmentZh} ${x.equipment} ${x.categoryZh} ${x.secondary.join(' ')}`.toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

/** 動作分類（部位）順序 */
export const CATEGORY_ORDER = [
  'chest',
  'back',
  'shoulders',
  'upper arms',
  'lower arms',
  'upper legs',
  'lower legs',
  'waist',
  'cardio',
  'neck',
]
