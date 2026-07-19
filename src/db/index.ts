import Dexie, { type EntityTable } from 'dexie'

/** 訓練計劃入面嘅一個動作 */
export interface PlanExercise {
  exerciseId: string
  targetSets: number
  targetReps: number
}

export interface Plan {
  id: number
  name: string
  exercises: PlanExercise[]
  createdAt: number
}

export interface SetRecord {
  weightKg: number
  reps: number
}

export interface SessionEntry {
  exerciseId: string
  sets: SetRecord[]
}

/** 一次完成咗嘅訓練 */
export interface Session {
  id: number
  planId?: number
  planName?: string
  startedAt: number
  durationSec: number
  entries: SessionEntry[]
}

/** 我的健身房器材：preset = 資料集器材種類；custom = 用戶自訂機械 */
export interface GymMachine {
  id: number
  kind: 'preset' | 'custom'
  name: string
  /** preset 時對應資料集 equipment key */
  equipmentKey?: string
  /** custom 時關聯嘅動作 id */
  linkedExerciseIds: string[]
}

export const db = new Dexie('gymapp') as Dexie & {
  plans: EntityTable<Plan, 'id'>
  sessions: EntityTable<Session, 'id'>
  gymMachines: EntityTable<GymMachine, 'id'>
}

db.version(1).stores({
  plans: '++id, createdAt',
  sessions: '++id, startedAt',
  gymMachines: '++id, kind, equipmentKey',
})
