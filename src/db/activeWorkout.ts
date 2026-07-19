import { useSyncExternalStore } from 'react'

/** 進行中訓練嘅一組 */
export interface ActiveSet {
  weightKg: number | null
  reps: number | null
  done: boolean
}

export interface ActiveEntry {
  exerciseId: string
  targetSets: number
  targetReps: number
  sets: ActiveSet[]
}

/** 進行中嘅訓練（存 localStorage，防止意外刷新丟失） */
export interface ActiveWorkout {
  planId?: number
  planName?: string
  startedAt: number
  entries: ActiveEntry[]
}

const KEY = 'gymapp.activeWorkout'
let listeners: (() => void)[] = []
let snapshot: ActiveWorkout | null = readStorage()

function readStorage(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null
  } catch {
    return null
  }
}

function emit() {
  for (const l of listeners) l()
}

export function getActiveWorkout(): ActiveWorkout | null {
  return snapshot
}

export function setActiveWorkout(w: ActiveWorkout | null) {
  snapshot = w
  if (w) localStorage.setItem(KEY, JSON.stringify(w))
  else localStorage.removeItem(KEY)
  emit()
}

export function updateActiveWorkout(fn: (w: ActiveWorkout) => ActiveWorkout) {
  if (!snapshot) return
  setActiveWorkout(fn(snapshot))
}

export function useActiveWorkout(): ActiveWorkout | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.push(cb)
      return () => {
        listeners = listeners.filter((l) => l !== cb)
      }
    },
    () => snapshot,
  )
}
