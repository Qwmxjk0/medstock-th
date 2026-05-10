import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'
import { useUser } from '../../context/UserContext'
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  ClipboardList, RefreshCcw, BarChart2, Settings, Upload, Info, X, Phone,
  LogOut, KeyRound, Eye, EyeOff, User as UserIcon,
} from 'lucide-react'

const nav = [
  { to: '/',           label: 'หน้าหลัก',         icon: LayoutDashboard },
  { to: '/products',   label: 'ทะเบียนเวชภัณฑ์',  icon: Package },
  { to: '/stock-in',   label: 'รับสินค้า',        icon: ArrowDownToLine },
  { to: '/stock-out',  label: 'เบิกสินค้า',       icon: ArrowUpFromLine },
  { to: '/stock-card', label: 'Stock Card',        icon: ClipboardList },
  { to: '/adjustment', label: 'ตัดปรับสต๊อก',     icon: RefreshCcw },
  { to: '/reports',    label: 'รายงาน',            icon: BarChart2 },
  { to: '/import',     label: 'นำเข้าข้อมูล',     icon: Upload },
  { to: '/master',     label: 'ข้อมูลพื้นฐาน',    icon: Settings },
]

interface Props {
  onLogout: () => void
}

export function Sidebar({ onLogout }: Props) {
  const { currentUser, canManageMaster } = useUser()
  const [showAbout, setShowAbout] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)

  return (
    <>
      <aside className="w-56 shrink-0 bg-slate-800 text-slate-100 flex flex-col h-full">
        <div className="px-4 py-5 border-b border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">MedStock</p>
          <p className="text-sm font-medium text-slate-200">ระบบสต๊อกเวชภัณฑ์</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.filter(item => item.to !== '/master' || canManageMaster).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Current user + actions */}
        <div className="border-t border-slate-700 p-3 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-300">
            <UserIcon size={13} className="shrink-0 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{currentUser?.displayName}</p>
              <p className="truncate text-slate-500">{currentUser?.username} · {currentUser?.isSystemAccount ? 'admin' : currentUser?.role}</p>
            </div>
          </div>

          {/* Change password */}
          <button
            onClick={() => setShowChangePw(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <KeyRound size={13} />
            <span>เปลี่ยนรหัสผ่าน</span>
          </button>

          {/* About */}
          <button
            onClick={() => setShowAbout(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <Info size={13} />
            <span>เกี่ยวกับโปรแกรม</span>
            <span className="ml-auto text-slate-600">v1.0.1</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
          >
            <LogOut size={13} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* About modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAbout(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">MedStock</p>
                <p className="text-lg font-semibold text-slate-800">ระบบสต๊อกเวชภัณฑ์</p>
              </div>
              <button onClick={() => setShowAbout(false)} className="text-slate-400 hover:text-slate-600 mt-0.5">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Version 1.0.1
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">ผู้พัฒนา</p>
              <p className="text-sm font-medium text-slate-800">นายกฤตนัย กัปตพล</p>
              <a href="tel:0990528939" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                <Phone size={13} />
                099-052-8939
              </a>
            </div>
            <p className="text-xs text-slate-400 text-center pt-1">© 2568 สงวนลิขสิทธิ์</p>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {showChangePw && currentUser && (
        <ChangePwModal userID={currentUser.id} onClose={() => setShowChangePw(false)} />
      )}
    </>
  )
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePwModal({ userID, onClose }: { userID: number; onClose: () => void }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setError('')
    if (newPw.length < 6) { setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (newPw !== newPw2) { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    setLoading(true)
    try {
      await api.setPassword(userID, oldPw, newPw)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">เปลี่ยนรหัสผ่าน</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-green-600 font-medium text-sm">เปลี่ยนรหัสผ่านสำเร็จ</p>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200">ปิด</button>
          </div>
        ) : (
          <>
            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <PwField label="รหัสผ่านเดิม" value={oldPw} show={showOld} onToggle={() => setShowOld(p => !p)} onChange={setOldPw} />
            <PwField label="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" value={newPw} show={showNew} onToggle={() => setShowNew(p => !p)} onChange={setNewPw} />
            <PwField label="ยืนยันรหัสผ่านใหม่" value={newPw2} show={showNew} onToggle={() => setShowNew(p => !p)} onChange={setNewPw2} onEnter={save} />
            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={loading || !oldPw || !newPw || !newPw2}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                ยกเลิก
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PwField({ label, value, show, onToggle, onChange, onEnter }: {
  label: string; value: string; show: boolean
  onToggle: () => void; onChange: (v: string) => void; onEnter?: () => void
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  )
}

