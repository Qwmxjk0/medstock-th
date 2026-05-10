import { useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { today } from '../../lib/utils'
import { Download, FileSpreadsheet, HardDriveDownload } from 'lucide-react'
import { useUser } from '../../context/UserContext'

type ReportType = 'inventory' | 'in' | 'out' | 'backup'

export function ReportsPage() {
  const { canManageMaster, currentUser } = useUser()
  const [tab, setTab] = useState<ReportType>('inventory')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const backupDatabase = async () => {
    const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
    const destPath = await api.saveBackupFileDialog(`medstock-backup-${ts}.db`) as string
    if (!destPath) return

    setLoading(true)
    setMsg('')
    try {
      const path = await api.backupDatabase(destPath, currentUser?.id ?? 0) as string
      setMsg(`บันทึกไฟล์ backup สำเร็จ:\n${path}`)
    } catch (e: any) {
      setMsg('backup ไม่สำเร็จ: ' + (e.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const restoreDatabase = async () => {
    const sourcePath = await api.openBackupFileDialog() as string
    if (!sourcePath) return
    if (!confirm('ต้องการ restore ฐานข้อมูลจากไฟล์นี้ใช่หรือไม่? ระบบจะ backup ฐานข้อมูลปัจจุบันก่อน restore')) return

    setLoading(true)
    setMsg('')
    try {
      const preRestoreBackup = await api.restoreDatabase(sourcePath, currentUser?.id ?? 0) as string
      setMsg(`restore สำเร็จ\nbackup ก่อน restore ถูกเก็บไว้ที่:\n${preRestoreBackup}`)
      setTimeout(() => window.location.reload(), 800)
    } catch (e: any) {
      setMsg('restore ไม่สำเร็จ: ' + (e.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    if (tab === 'backup') {
      await backupDatabase()
      return
    }

    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    let defaultName = ''
    if (tab === 'inventory') defaultName = `stock-inventory-${ts}.xlsx`
    else if (tab === 'in') defaultName = `report-IN-${ts}.xlsx`
    else if (tab === 'out') defaultName = `report-OUT-${ts}.xlsx`

    const destPath = await api.saveFileDialog(defaultName) as string
    if (!destPath) return

    setLoading(true)
    setMsg('')
    try {
      let path = ''
      if (tab === 'inventory') {
        path = await api.exportInventory(destPath) as string
      } else if (tab === 'in') {
        path = await api.exportDocuments('IN', dateFrom, dateTo, destPath) as string
      } else if (tab === 'out') {
        path = await api.exportDocuments('OUT', dateFrom, dateTo, destPath) as string
      }
      setMsg(`บันทึกไฟล์สำเร็จ:\n${path}`)
    } catch (e: any) {
      setMsg('ส่งออกไม่สำเร็จ: ' + (e.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: ReportType; label: string }[] = [
    { id: 'inventory', label: 'รายงานคงคลัง' },
    { id: 'in', label: 'รายงานรับเข้า' },
    { id: 'out', label: 'รายงานเบิกออก' },
    ...(canManageMaster ? [{ id: 'backup' as const, label: 'Backup Database' }] : []),
  ]

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">รายงาน</h1>

      <div className="flex gap-1 border-b border-gray-200">
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

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {tab !== 'inventory' && tab !== 'backup' && (
          <div className="flex gap-3 items-end">
            <Input label="จากวันที่" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input label="ถึงวันที่" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        )}

        <div className="flex items-center gap-3">
          {tab === 'backup'
            ? <HardDriveDownload size={24} className="text-blue-600" />
            : <FileSpreadsheet size={24} className="text-green-600" />}
          <div>
            <p className="font-medium text-gray-800">
              {tab === 'inventory' && 'รายงานคงคลัง'}
              {tab === 'in' && 'รายงานรับเข้า'}
              {tab === 'out' && 'รายงานเบิกออก'}
              {tab === 'backup' && 'Backup ฐานข้อมูลทั้งหมด'}
            </p>
            <p className="text-sm text-gray-500">
              {tab === 'backup'
                ? 'รวมข้อมูลทั้งหมด เช่น stock movements, documents, lots, users, roles และ audit logs'
                : 'ส่งออกเป็นไฟล์ .xlsx'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={exportReport} disabled={loading}>
            <Download size={14} />
            {loading ? 'กำลังบันทึก...' : tab === 'backup' ? 'Backup .db' : 'Export .xlsx'}
          </Button>
          {tab === 'backup' && (
            <Button variant="secondary" onClick={restoreDatabase} disabled={loading}>
              <HardDriveDownload size={14} />
              Restore .db
            </Button>
          )}
        </div>

        {msg && (
          <pre className={`text-sm p-3 rounded ${msg.includes('สำเร็จ') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </pre>
        )}
      </div>
    </div>
  )
}
