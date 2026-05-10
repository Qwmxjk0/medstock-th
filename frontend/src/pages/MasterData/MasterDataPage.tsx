import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import type { Unit, Department, Supplier, ProductCategory, User } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useUser } from '../../context/UserContext'
import { Plus, Pencil, X, KeyRound, Eye, EyeOff } from 'lucide-react'

type Tab = 'units' | 'departments' | 'suppliers' | 'categories' | 'users'

export function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('units')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'units', label: 'หน่วยนับ' },
    { id: 'departments', label: 'หน่วยงาน' },
    { id: 'suppliers', label: 'บริษัท' },
    { id: 'categories', label: 'กลุ่มยา/ประเภทเวชภัณฑ์' },
    { id: 'users', label: 'ผู้ใช้งาน' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">ข้อมูลตั้งต้น</h1>
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t-md transition ${
              tab === t.id ? 'bg-white border border-b-white border-gray-200 text-blue-600 font-medium -mb-px' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'units' && <UnitsTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}

// ─── Generic simple list editor ──────────────────────────────────────────────

function SimpleListTab<T extends { id: number; name: string; isActive: boolean }>({
  fetchFn, saveFn, deactivateFn, extraField,
}: {
  fetchFn: () => Promise<T[]>
  saveFn: (item: any) => Promise<number>
  deactivateFn: (id: number) => Promise<void>
  extraField?: { key: string; label: string }
}) {
  const { isGuest } = useUser()
  const [items, setItems] = useState<T[]>([])
  const [editing, setEditing] = useState<Partial<T> | null>(null)
  const [confirm, setConfirm] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = () => fetchFn().then(data => setItems(data ?? [])).catch(() => {})
  useEffect(() => { load() }, [])

  const save = async () => {
    setError('')
    try {
      await saveFn(editing)
      setEditing(null)
      load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const deactivate = async (id: number) => {
    try {
      await deactivateFn(id)
      load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const visible = showInactive ? items : items.filter(i => i.isActive)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          แสดงที่ปิดใช้งานแล้ว
        </label>
        {!isGuest && <Button size="sm" onClick={() => setEditing({ id: 0, name: '', isActive: true } as any)}>
          <Plus size={14} /> เพิ่ม
        </Button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {editing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-sm font-medium text-blue-700">{editing.id ? 'แก้ไข' : 'เพิ่ม'}</p>
          <Input
            placeholder="ชื่อ *"
            value={editing.name ?? ''}
            onChange={e => setEditing(prev => ({ ...(prev as any), name: e.target.value }))}
          />
          {extraField && (
            <Input
              placeholder={extraField.label}
              value={(editing as any)[extraField.key] ?? ''}
              onChange={e => setEditing(prev => ({ ...(prev as any), [extraField.key]: e.target.value }))}
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>บันทึก</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>ยกเลิก</Button>
          </div>
        </div>
      )}
      <Table>
        <Thead>
          <Tr><Th>ชื่อ</Th>{extraField && <Th>{extraField.label}</Th>}<Th>สถานะ</Th><Th></Th></Tr>
        </Thead>
        <Tbody>
          {visible.map(item => (
            <Tr key={item.id}>
              <Td>{item.name}</Td>
              {extraField && <Td>{(item as any)[extraField.key] ?? '-'}</Td>}
              <Td>
                <span className={`text-xs px-2 py-0.5 rounded ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </Td>
              <Td>
                <div className="flex gap-1">
                  {!isGuest && <button onClick={() => setEditing(item)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                    <Pencil size={13} />
                  </button>}
                  {!isGuest && item.isActive && (
                    <button onClick={() => setConfirm(item.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm !== null && deactivate(confirm)}
        title="ปิดใช้งาน"
        message="ต้องการปิดใช้งานรายการนี้?"
        danger
        confirmLabel="ปิดใช้งาน"
      />
    </div>
  )
}

function UnitsTab() {
  return (
    <SimpleListTab<Unit>
      fetchFn={() => api.getUnits(false) as any}
      saveFn={u => api.saveUnit(u) as any}
      deactivateFn={id => api.deactivateUnit(id, 1) as any}
    />
  )
}

function DepartmentsTab() {
  return (
    <SimpleListTab<Department>
      fetchFn={() => api.getDepartments(false) as any}
      saveFn={d => api.saveDepartment(d) as any}
      deactivateFn={id => api.deactivateDepartment(id, 1) as any}
    />
  )
}

function SuppliersTab() {
  return (
    <SimpleListTab<Supplier>
      fetchFn={() => api.getSuppliers(false) as any}
      saveFn={s => api.saveSupplier(s) as any}
      deactivateFn={id => api.deactivateSupplier(id, 1) as any}
      extraField={{ key: 'contact', label: 'ติดต่อ/โทร' }}
    />
  )
}

function CategoriesTab() {
  return (
    <SimpleListTab<ProductCategory>
      fetchFn={() => api.getCategories(false) as any}
      saveFn={c => api.saveCategory(c) as any}
      deactivateFn={id => api.deactivateCategory(id, 1) as any}
    />
  )
}

function UsersTab() {
  const { currentUser, isSysAdmin } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [creating, setCreating] = useState(false)
  const [editingName, setEditingName] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  // new user form
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)

  // reset pw form
  const [resetPw, setResetPw] = useState('')
  const [resetPw2, setResetPw2] = useState('')
  const [showResetPw, setShowResetPw] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => api.getUsers().then((u: any) => setUsers(u ?? [])).catch(() => {})
  useEffect(() => { load() }, [])

  const createUser = async () => {
    setError(''); setSuccess('')
    if (newPw !== newPw2) { setError('รหัสผ่านไม่ตรงกัน'); return }
    try {
      await api.createUser(currentUser!.id, { id: 0, username: newUsername, displayName: newDisplayName, isSystemAccount: false, isActive: true, lockedAt: '', lastSelectedAt: '', createdAt: '', updatedAt: '' }, newPw)
      setCreating(false); setNewUsername(''); setNewDisplayName(''); setNewPw(''); setNewPw2('')
      load()
      setSuccess('เพิ่มผู้ใช้สำเร็จ')
    } catch (e: any) { setError(e.message ?? String(e)) }
  }

  const saveDisplayName = async () => {
    if (!editingName) return
    setError(''); setSuccess('')
    try {
      await api.saveUser(editingName as any)
      setEditingName(null); load()
    } catch (e: any) { setError(e.message ?? String(e)) }
  }

  const resetPassword = async () => {
    if (!resetTarget) return
    setError(''); setSuccess('')
    if (resetPw !== resetPw2) { setError('รหัสผ่านไม่ตรงกัน'); return }
    try {
      await api.resetPassword(currentUser!.id, resetTarget.id, resetPw)
      setResetTarget(null); setResetPw(''); setResetPw2('')
      setSuccess(`รีเซตรหัสผ่าน ${resetTarget.displayName} สำเร็จ (ผู้ใช้ต้องเปลี่ยนรหัสผ่านตอน login)`)
    } catch (e: any) { setError(e.message ?? String(e)) }
  }

  const normalUsers = users.filter(u => !u.isSystemAccount)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {isSysAdmin && (
          <Button size="sm" onClick={() => { setCreating(true); setError(''); setSuccess('') }}>
            <Plus size={14} /> เพิ่มผู้ใช้
          </Button>
        )}
        {!isSysAdmin && <div />}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>}

      {/* Create user form */}
      {creating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-700">เพิ่มผู้ใช้ใหม่</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Username *" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            <Input placeholder="ชื่อ-นามสกุล *" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 relative">
            <div className="relative">
              <input type={showNewPw ? 'text' : 'password'} placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว) *"
                value={newPw} onChange={e => setNewPw(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500" />
              <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                {showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input type={showNewPw ? 'text' : 'password'} placeholder="ยืนยันรหัสผ่าน *"
              value={newPw2} onChange={e => setNewPw2(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500" />
          </div>
          <p className="text-xs text-blue-600">* ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเมื่อ login ครั้งแรก</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={createUser}>บันทึก</Button>
            <Button size="sm" variant="secondary" onClick={() => setCreating(false)}>ยกเลิก</Button>
          </div>
        </div>
      )}

      {/* Reset password form */}
      {resetTarget && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">รีเซตรหัสผ่าน: {resetTarget.displayName}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input type={showResetPw ? 'text' : 'password'} placeholder="รหัสผ่านใหม่ *"
                value={resetPw} onChange={e => setResetPw(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500" />
              <button type="button" onClick={() => setShowResetPw(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                {showResetPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input type={showResetPw ? 'text' : 'password'} placeholder="ยืนยันรหัสผ่านใหม่ *"
              value={resetPw2} onChange={e => setResetPw2(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={resetPassword}>รีเซต</Button>
            <Button size="sm" variant="secondary" onClick={() => setResetTarget(null)}>ยกเลิก</Button>
          </div>
        </div>
      )}

      {/* Edit display name */}
      {editingName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 items-center">
          <Input
            placeholder="ชื่อ-นามสกุล *"
            value={editingName.displayName}
            onChange={e => setEditingName(p => p ? { ...p, displayName: e.target.value } : p)}
          />
          <Button size="sm" onClick={saveDisplayName}>บันทึก</Button>
          <Button size="sm" variant="secondary" onClick={() => setEditingName(null)}>ยกเลิก</Button>
        </div>
      )}

      <Table>
        <Thead>
          <Tr><Th>Username</Th><Th>ชื่อ-นามสกุล</Th><Th>สถานะ</Th><Th></Th></Tr>
        </Thead>
        <Tbody>
          {normalUsers.map(u => (
            <Tr key={u.id}>
              <Td className="font-mono text-gray-600">{u.username}</Td>
              <Td className="font-medium">{u.displayName}</Td>
              <Td>
                <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {u.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </Td>
              <Td>
                <div className="flex gap-1">
                  {isSysAdmin && (
                    <>
                      <button onClick={() => { setEditingName(u); setError(''); setSuccess('') }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400" title="แก้ไขชื่อ">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => { setResetTarget(u); setResetPw(''); setResetPw2(''); setError(''); setSuccess('') }}
                        className="p-1 rounded hover:bg-amber-50 text-amber-500" title="รีเซตรหัสผ่าน">
                        <KeyRound size={13} />
                      </button>
                      {u.isActive && u.id !== currentUser?.id && (
                        <button onClick={() => setDeactivateId(u.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-400" title="ปิดใช้งาน">
                          <X size={13} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {normalUsers.length === 0 && (
            <Tr><Td colSpan={4} className="text-center text-gray-400 py-6 text-xs">ยังไม่มีผู้ใช้งาน</Td></Tr>
          )}
        </Tbody>
      </Table>

      <ConfirmDialog
        open={deactivateId !== null}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => { deactivateId && api.deactivateUser(deactivateId, currentUser?.id ?? 1).then(load) }}
        title="ปิดใช้งานผู้ใช้"
        message="ต้องการปิดใช้งานผู้ใช้นี้? (ข้อมูลยังคงอยู่)"
        danger
        confirmLabel="ปิดใช้งาน"
      />
    </div>
  )
}
