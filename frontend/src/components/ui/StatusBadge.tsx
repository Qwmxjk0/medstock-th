import { cn } from '../../lib/utils'

const statusConfig: Record<string, { label: string; class: string }> = {
  Draft:     { label: 'ร่าง',    class: 'bg-gray-100 text-gray-700 border border-gray-300' },
  Confirmed: { label: 'ยืนยัน', class: 'bg-green-100 text-green-800 border border-green-300' },
  Cancelled: { label: 'ยกเลิก', class: 'bg-red-100 text-red-800 border border-red-300' },
  Adjusted:  { label: 'ปรับปรุง', class: 'bg-blue-100 text-blue-800 border border-blue-300' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, class: 'bg-gray-100 text-gray-700' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.class)}>
      {cfg.label}
    </span>
  )
}
