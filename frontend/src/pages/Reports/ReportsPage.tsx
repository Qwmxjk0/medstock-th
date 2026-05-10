import { useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { today } from '../../lib/utils'
import { Download, FileSpreadsheet } from 'lucide-react'

type ReportType = 'inventory' | 'in' | 'out' | 'stockcard'

export function ReportsPage() {
  const [tab, setTab] = useState<ReportType>('inventory')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const exportReport = async () => {
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    let defaultName = ''
    if (tab === 'inventory') defaultName = `stock-inventory-${ts}.xlsx`
    else if (tab === 'in') defaultName = `report-IN-${ts}.xlsx`
    else if (tab === 'out') defaultName = `report-OUT-${ts}.xlsx`

    const destPath = await api.saveFileDialog(defaultName) as string
    if (!destPath) return  // user cancelled

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
    { id: 'inventory', label: 'รายงานเวชภัณฑ์คงคลัง' },
    { id: 'in', label: 'รายงานรับสินค้าประจำเดือน' },
    { id: 'out', label: 'รายงานเบิกยาประจำเดือน' },
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
        {tab !== 'inventory' && (
          <div className="flex gap-3 items-end">
            <Input label="จากวันที่" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input label="ถึงวันที่" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <FileSpreadsheet size={24} className="text-green-600" />
          <div>
            <p className="font-medium text-gray-800">
              {tab === 'inventory' && 'รายงานเวชภัณฑ์คงคลัง'}
              {tab === 'in' && 'รายงานรับสินค้าประจำเดือน'}
              {tab === 'out' && 'รายงานเบิกยาประจำเดือน'}
            </p>
            <p className="text-sm text-gray-500">ส่งออกเป็นไฟล์ .xlsx</p>
          </div>
        </div>

        <Button onClick={exportReport} disabled={loading}>
          <Download size={14} />
          {loading ? 'กำลังส่งออก...' : 'Export .xlsx'}
        </Button>

        {msg && (
          <pre className={`text-sm p-3 rounded ${msg.startsWith('บันทึก') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </pre>
        )}
      </div>
    </div>
  )
}
