import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useUser } from '../../context/UserContext'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description?: string
  onConfirmed: () => void
  onCancel: () => void
}

/**
 * Modal ให้กรอก password ยืนยันก่อนดำเนินการสำคัญ
 * ใช้งาน: <PasswordConfirmModal open={...} title="ยืนยันรับสินค้า" onConfirmed={doConfirm} onCancel={() => setOpen(false)} />
 */
export function PasswordConfirmModal({ open, title, description, onConfirmed, onCancel }: Props) {
  const { currentUser } = useUser()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError('')
      setShowPw(false)
    }
  }, [open])

  if (!open) return null

  const confirm = async () => {
    if (!currentUser || !password) return
    setLoading(true)
    setError('')
    try {
      await api.verifyPassword(currentUser.id, password)
      onConfirmed()
    } catch (e: any) {
      setError(e.message ?? 'รหัสผ่านไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-80 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          ผู้ใช้: <span className="font-medium text-gray-700">{currentUser?.displayName}</span>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="relative">
          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="รหัสผ่านของคุณ"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            autoFocus
            className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={loading || !password}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}
