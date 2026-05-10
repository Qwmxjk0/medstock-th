import { useUser } from '../../context/UserContext'
import type { User as UserModel } from '../../types/models'

interface TopBarProps {
  currentUser: UserModel | null
  onSelectUser: (u: UserModel) => void
}

// Props kept for backwards compat but currentUser now comes from context
export function TopBar(_props: TopBarProps) {
  const { currentUser } = useUser()
  const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <span className="text-sm text-gray-500">{now}</span>
      <span className="text-sm text-gray-600 font-medium">
        {currentUser?.displayName ?? ''}
        {currentUser?.isSystemAccount && <span className="ml-1.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">ผู้ดูแลระบบ</span>}
      </span>
    </header>
  )
}
