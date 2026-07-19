import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ExercisePicker from '../components/ExercisePicker'
import { useExercises } from '../data/exercises'
import { db } from '../db'

export default function GymPage() {
  const all = useExercises()
  const machines = useLiveQuery(() => db.gymMachines.toArray(), [])
  const [customName, setCustomName] = useState('')
  const [pickingFor, setPickingFor] = useState<string | null>(null) // 自訂機械名
  const [editingMachineId, setEditingMachineId] = useState<number | null>(null)

  const equipments = useMemo(() => {
    if (!all) return []
    const count = new Map<string, { label: string; n: number }>()
    for (const x of all) {
      const cur = count.get(x.equipment)
      if (cur) cur.n++
      else count.set(x.equipment, { label: x.equipmentZh, n: 1 })
    }
    return [...count.entries()]
      .filter(([key]) => key !== 'body weight') // 徒手預設一定有
      .sort((a, b) => b[1].n - a[1].n)
      .map(([key, v]) => ({ key, label: v.label, n: v.n }))
  }, [all])

  const presetKeys = useMemo(
    () =>
      new Set(
        (machines ?? [])
          .filter((m) => m.kind === 'preset' && m.equipmentKey)
          .map((m) => m.equipmentKey!),
      ),
    [machines],
  )
  const customMachines = (machines ?? []).filter((m) => m.kind === 'custom')

  const togglePreset = async (key: string, label: string) => {
    const existing = (machines ?? []).find((m) => m.kind === 'preset' && m.equipmentKey === key)
    if (existing) await db.gymMachines.delete(existing.id)
    else
      await db.gymMachines.add({
        kind: 'preset',
        name: label,
        equipmentKey: key,
        linkedExerciseIds: [],
      } as never)
  }

  const startAddCustom = () => {
    const name = customName.trim()
    if (!name) return
    setEditingMachineId(null)
    setPickingFor(name)
  }

  const savePicked = async (ids: string[]) => {
    if (editingMachineId != null) {
      const m = await db.gymMachines.get(editingMachineId)
      if (m) {
        m.linkedExerciseIds = [...new Set([...m.linkedExerciseIds, ...ids])]
        await db.gymMachines.put(m)
      }
    } else if (pickingFor) {
      await db.gymMachines.add({
        kind: 'custom',
        name: pickingFor,
        linkedExerciseIds: ids,
      } as never)
      setCustomName('')
    }
    setPickingFor(null)
    setEditingMachineId(null)
  }

  const exerciseName = (id: string) => all?.find((x) => x.id === id)?.name ?? id

  return (
    <div className="p-3">
      <h1 className="mb-1 text-lg font-bold">我的健身房</h1>
      <p className="mb-4 text-xs text-slate-400">
        登記你健身房有嘅器材，動作庫就可以只顯示你做到嘅動作。徒手動作預設全部可做。
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">自訂機械</h2>
        <p className="mb-2 text-xs text-slate-500">
          輸入你健身房部機嘅名（例如「chest press」「腿推機」），再揀返呢部機做到嘅動作。
        </p>
        <div className="mb-2 flex gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startAddCustom()}
            placeholder="機械名稱…"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={startAddCustom}
            disabled={!customName.trim()}
            className="rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            揀動作
          </button>
        </div>
        <div className="space-y-2">
          {customMachines.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.name}</span>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMachineId(m.id)
                      setPickingFor(m.name)
                    }}
                    className="text-emerald-400"
                  >
                    ＋加動作
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`刪除「${m.name}」？`)) db.gymMachines.delete(m.id)
                    }}
                    className="text-red-400"
                  >
                    刪除
                  </button>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.linkedExerciseIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                  >
                    {exerciseName(id)}
                    <button
                      type="button"
                      className="text-slate-500"
                      onClick={async () => {
                        const machine = await db.gymMachines.get(m.id)
                        if (machine) {
                          machine.linkedExerciseIds = machine.linkedExerciseIds.filter(
                            (x) => x !== id,
                          )
                          await db.gymMachines.put(machine)
                        }
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {m.linkedExerciseIds.length === 0 && (
                  <span className="text-[10px] text-slate-500">未關聯動作</span>
                )}
              </div>
            </div>
          ))}
          {customMachines.length === 0 && (
            <p className="text-xs text-slate-600">未有自訂機械</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">器材種類</h2>
        <div className="grid grid-cols-2 gap-2">
          {equipments.map((e) => {
            const on = presetKeys.has(e.key)
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => togglePreset(e.key, e.label)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${
                  on
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                    : 'border-slate-800 bg-slate-900 text-slate-300'
                }`}
              >
                <span className="truncate">{e.label}</span>
                <span className="ml-1 shrink-0 text-[10px] text-slate-500">{e.n}</span>
              </button>
            )
          })}
        </div>
      </section>

      {pickingFor && (
        <ExercisePicker
          title={`「${pickingFor}」做到嘅動作`}
          multi
          initialQuery={/^[\x00-\x7F]*$/.test(pickingFor) ? pickingFor : ''}
          onDone={(selected) => savePicked(selected.map((x) => x.id))}
          onClose={() => {
            setPickingFor(null)
            setEditingMachineId(null)
          }}
        />
      )}
    </div>
  )
}
