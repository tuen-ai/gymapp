export default function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-500 text-slate-950'
          : 'border border-slate-700 bg-slate-900 text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}
