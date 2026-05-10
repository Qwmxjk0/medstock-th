import { useState } from 'react'
import { api } from '../../lib/api'
import type { User } from '../../types/models'
import { useUser } from '../../context/UserContext'
import { Lock, User as UserIcon, Eye, EyeOff, RefreshCcw, Eye as EyeIcon } from 'lucide-react'

interface Props {
  onLoggedIn: () => void
}

export function UserSelectPage({ onLoggedIn }: Props) {
  const { setCurrentUser, loginAsGuest } = useUser()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mustChange, setMustChange] = useState(false)
  const [loggedUser, setLoggedUser] = useState<User | null>(null)
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')

  const login = async () => {
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      const user = await api.login(username, password) as User
      const needChange = await api.userMustChangePassword(user.id) as boolean
      if (needChange) {
        setLoggedUser(user)
        setMustChange(true)
        setLoading(false)
        return
      }
      setCurrentUser(user)
      onLoggedIn()
    } catch (e: any) {
      setError(e.message ?? 'รหัสผ่านไม่ถูกต้อง')
    } finally {
      setLoading(false)
    }
  }

  const changeAndLogin = async () => {
    if (!loggedUser) return
    if (newPw.length < 6) { setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (newPw !== newPw2) { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    setLoading(true)
    setError('')
    try {
      await api.setPassword(loggedUser.id, password, newPw)
      const user = await api.login(username, newPw) as User
      setCurrentUser(user)
      onLoggedIn()
    } catch (e: any) {
      setError(e.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">MedStock</p>
          <p className="text-2xl font-semibold text-white">ระบบสต๊อกเวชภัณฑ์</p>
          <p className="text-sm text-slate-400 mt-1">กรุณาเข้าสู่ระบบ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          {!mustChange ? (
            <>
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {/* Username */}
              <div className="relative">
                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ชื่อผู้ใช้ (Username)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                onClick={login}
                disabled={loading || !username || !password}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>

              <div className="relative flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">หรือ</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={() => { loginAsGuest(); onLoggedIn() }}
                className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <EyeIcon size={14} />
                เข้าในฐานะผู้เยี่ยมชม (ดูข้อมูลเท่านั้น)
              </button>
            </>
          ) : (
            /* Must change password */
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 p-3 rounded-lg">
                <RefreshCcw size={14} />
                กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งาน
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <input
                type="password"
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={newPw2}
                onChange={e => setNewPw2(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && changeAndLogin()}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
              />

              <button
                onClick={changeAndLogin}
                disabled={loading || !newPw || !newPw2}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านและเข้าสู่ระบบ'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">v1.0.01 · MedStock</p>
      </div>
    </div>
  )
}

