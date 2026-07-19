import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useActiveWorkout } from './db/activeWorkout'

const TABS = [
  { to: '/exercises', label: '動作庫', icon: '🏋️' },
  { to: '/gym', label: '我的健身房', icon: '🏠' },
  { to: '/workout', label: '訓練', icon: '▶️' },
  { to: '/plans', label: '計劃', icon: '📋' },
  { to: '/history', label: '紀錄', icon: '📈' },
]

export default function Layout() {
  const location = useLocation()
  const active = useActiveWorkout()
  // 動作詳情頁都算動作庫 tab
  const isTabActive = (to: string) =>
    to === '/exercises'
      ? location.pathname === '/' || location.pathname.startsWith('/exercises')
      : location.pathname.startsWith(to)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                isTabActive(t.to) ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
              {t.to === '/workout' && active && (
                <span className="absolute right-1/4 top-1 h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
