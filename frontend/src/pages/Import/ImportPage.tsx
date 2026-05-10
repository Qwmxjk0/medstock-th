import { useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { formatNumber } from '../../lib/utils'
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useUser } from '../../context/UserContext'

type TabType = 'products' | 'opening'
type Phase = 'idle' | 'previewing' | 'importing' | 'done'

interface ImportError { row: number; column: string; message: string }
interface ImportResult { success: number; failed: number; message: string }

interface ProductRow {
  rowNum: number; code: string; name: string; categoryName: string
  unitName: string; packageSize: number; reorderLevel: number; defaultPrice: number; hasError: boolean
}
interface StockRow {
  rowNum: number; productCode: string; lotNo: string; expireDate: string
  quantity: number; unitCost: number; supplierName: string; hasError: boolean
}

export function ImportPage() {
  const { currentUser, isGuest } = useUser()
  const [tab, setTab] = useState<TabType>('products')

  if (isGuest) return (
    <div className="p-8 flex flex-col items-center gap-3 text-center">
      <p className="text-gray-500 font-medium">ผู้เยี่ยมชมไม่สามารถนำเข้าข้อมูลได้</p>
      <p className="text-sm text-gray-400">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ใช้</p>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">นำเข้าข้อมูล</h1>

      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'products', label: 'นำเข้าทะเบียนเวชภัณฑ์' },
          { id: 'opening', label: 'นำเข้ายอดยกมา (Opening Stock)' },
        ] as { id: TabType; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t-md transition ${
              tab === t.id
                ? 'bg-white border border-b-white border-gray-200 text-blue-600 font-medium -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' ? <ProductsImportTab userID={currentUser?.id ?? 1} /> : <StockImportTab userID={currentUser?.id ?? 1} />}
    </div>
  )
}

// ─── Products Import Tab ──────────────────────────────────────────────────────

function ProductsImportTab({ userID }: { userID: number }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [filePath, setFilePath] = useState('')
  const [preview, setPreview] = useState<{ rows: ProductRow[]; errors: ImportError[]; totalRows: number; canImport: boolean } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const pickFile = async () => {
    setErr('')
    const path = await api.openFileDialog() as string
    if (!path) return
    setFilePath(path)
    setLoading(true)
    try {
      const p = await api.previewProductsImport(path) as any
      setPreview({ ...p, rows: p?.rows ?? [], errors: p?.errors ?? [] })
      setPhase('previewing')
    } catch (e: any) {
      setErr(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  const doImport = async (partial: boolean) => {
    setLoading(true)
    setErr('')
    try {
      const r = await api.importProducts(filePath, partial, userID) as ImportResult
      setResult(r)
      setPhase('done')
    } catch (e: any) {
      setErr(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setPhase('idle'); setPreview(null); setResult(null); setFilePath(''); setErr('') }

  if (phase === 'done' && result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-4">
        <CheckCircle size={48} className="text-green-500" />
        <h2 className="text-lg font-semibold text-gray-800">นำเข้าเสร็จสิ้น</h2>
        <div className="flex gap-8 text-center">
          <div><p className="text-3xl font-bold text-green-600">{result.success}</p><p className="text-sm text-gray-500">สำเร็จ</p></div>
          <div><p className="text-3xl font-bold text-orange-500">{result.failed}</p><p className="text-sm text-gray-500">ข้ามไป</p></div>
        </div>
        <p className="text-sm text-gray-500">{result.message}</p>
        <Button onClick={reset}>นำเข้าอีกครั้ง</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">รูปแบบไฟล์ที่รองรับ</p>
        <p>Sheet ชื่อ <code className="bg-blue-100 px-1 rounded">1_ทะเบียนเวชภัณฑ์</code> — คอลัมน์: รหัสเวชภัณฑ์* | ชื่อ* | กลุ่มยา | หน่วยนับ* | หน่วยรับ | หน่วยเบิก | ขนาดบรรจุ | จุดสั่งซื้อ | ราคา</p>
        <p className="text-blue-600">ดาวน์โหลดไฟล์ตัวอย่าง: <code>example-opening-data.xlsx</code> (ในโฟลเดอร์โปรแกรม)</p>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap">
          <XCircle size={14} className="inline mr-1" />{err}
        </div>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-12 border-2 border-dashed border-gray-300 rounded-xl">
          <FileSpreadsheet size={48} className="text-gray-300" />
          <p className="text-gray-500">เลือกไฟล์ .xlsx ที่ต้องการนำเข้า</p>
          <Button onClick={pickFile} disabled={loading}>
            <Upload size={14} /> {loading ? 'กำลังอ่านไฟล์...' : 'เลือกไฟล์ Excel'}
          </Button>
        </div>
      )}

      {phase === 'previewing' && preview && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">พบ <strong>{preview.totalRows}</strong> แถว</span>
              {preview.errors.length > 0
                ? <span className="text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded"><AlertTriangle size={12} className="inline mr-1" />{preview.errors.length} ข้อผิดพลาด</span>
                : <span className="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded"><CheckCircle size={12} className="inline mr-1" />พร้อมนำเข้า</span>
              }
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>เลือกไฟล์ใหม่</Button>
          </div>

          {preview.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-red-700">รายการข้อผิดพลาด (ต้องแก้ไขก่อนนำเข้า)</p>
              {preview.errors.slice(0, 20).map((e, i) => (
                <p key={i} className="text-xs text-red-600">แถว {e.row} คอลัมน์ {e.column}: {e.message}</p>
              ))}
              {preview.errors.length > 20 && <p className="text-xs text-red-400">...และอีก {preview.errors.length - 20} รายการ</p>}
            </div>
          )}

          <div className="overflow-auto max-h-96">
            <Table>
              <Thead>
                <Tr>
                  <Th>แถว</Th><Th>รหัส</Th><Th>ชื่อเวชภัณฑ์</Th><Th>กลุ่มยา</Th>
                  <Th>หน่วยนับ</Th><Th className="text-right">บรรจุ</Th>
                  <Th className="text-right">จุดสั่งซื้อ</Th><Th className="text-right">ราคา</Th>
                </Tr>
              </Thead>
              <Tbody>
                {preview.rows.map(r => (
                  <Tr key={r.rowNum} className={r.hasError ? 'bg-red-50' : ''}>
                    <Td className="text-gray-400 text-xs">{r.rowNum}{r.hasError && ' ⚠'}</Td>
                    <Td className="font-mono text-sm">{r.code}</Td>
                    <Td>{r.name}</Td>
                    <Td className="text-gray-500 text-sm">{r.categoryName || '-'}</Td>
                    <Td className="text-gray-500 text-sm">{r.unitName}</Td>
                    <Td className="text-right text-sm">{r.packageSize || '-'}</Td>
                    <Td className="text-right text-sm">{r.reorderLevel || '-'}</Td>
                    <Td className="text-right text-sm">{r.defaultPrice ? `฿${formatNumber(r.defaultPrice)}` : '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
          {preview.totalRows > 50 && (
            <p className="text-xs text-gray-400 text-center">แสดง 50 แถวแรก จาก {preview.totalRows} แถว</p>
          )}

          <div className="flex gap-3">
            <Button onClick={() => doImport(false)} disabled={!preview.canImport || loading}>
              <CheckCircle size={14} /> {loading ? 'กำลังนำเข้า...' : `นำเข้าทั้งหมด (${preview.totalRows} แถว)`}
            </Button>
            {preview.errors.length > 0 && (
              <Button variant="secondary" onClick={() => {
                if (confirm(`มีข้อผิดพลาด ${preview.errors.length} แถว\nต้องการนำเข้าเฉพาะแถวที่ถูกต้องหรือไม่?`)) doImport(true)
              }} disabled={loading}>
                นำเข้าเฉพาะแถวที่ถูกต้อง ({preview.totalRows - preview.errors.length} แถว)
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Opening Stock Import Tab ─────────────────────────────────────────────────

function StockImportTab({ userID }: { userID: number }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [filePath, setFilePath] = useState('')
  const [preview, setPreview] = useState<{ rows: StockRow[]; errors: ImportError[]; totalRows: number; canImport: boolean } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const pickFile = async () => {
    setErr('')
    const path = await api.openFileDialog() as string
    if (!path) return
    setFilePath(path)
    setLoading(true)
    try {
      const p = await api.previewStockImport(path) as any
      setPreview({ ...p, rows: p?.rows ?? [], errors: p?.errors ?? [] })
      setPhase('previewing')
    } catch (e: any) {
      setErr(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  const doImport = async (partial: boolean) => {
    setLoading(true)
    setErr('')
    try {
      const r = await api.importOpeningStock(filePath, partial, userID) as ImportResult
      setResult(r)
      setPhase('done')
    } catch (e: any) {
      setErr(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setPhase('idle'); setPreview(null); setResult(null); setFilePath(''); setErr('') }

  if (phase === 'done' && result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-4">
        <CheckCircle size={48} className="text-green-500" />
        <h2 className="text-lg font-semibold text-gray-800">นำเข้ายอดยกมาเสร็จสิ้น</h2>
        <div className="flex gap-8 text-center">
          <div><p className="text-3xl font-bold text-green-600">{result.success}</p><p className="text-sm text-gray-500">สำเร็จ</p></div>
          <div><p className="text-3xl font-bold text-orange-500">{result.failed}</p><p className="text-sm text-gray-500">ข้ามไป</p></div>
        </div>
        <p className="text-sm text-gray-500">{result.message}</p>
        <Button onClick={reset}>นำเข้าอีกครั้ง</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">⚠ ควรนำเข้าทะเบียนเวชภัณฑ์ก่อน</p>
        <p>Sheet ชื่อ <code className="bg-amber-100 px-1 rounded">2_ยอดยกมา(Opening)</code> — คอลัมน์: รหัสเวชภัณฑ์* | Lot No. | วันหมดอายุ | จำนวน* | ราคาต้นทุน | บริษัท</p>
        <p>รหัสเวชภัณฑ์ต้องมีอยู่ในระบบแล้ว | วันหมดอายุ: YYYY-MM-DD หรือ DD/MM/YYYY</p>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-wrap">
          <XCircle size={14} className="inline mr-1" />{err}
        </div>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-12 border-2 border-dashed border-gray-300 rounded-xl">
          <FileSpreadsheet size={48} className="text-gray-300" />
          <p className="text-gray-500">เลือกไฟล์ .xlsx ที่ต้องการนำเข้า</p>
          <Button onClick={pickFile} disabled={loading}>
            <Upload size={14} /> {loading ? 'กำลังอ่านไฟล์...' : 'เลือกไฟล์ Excel'}
          </Button>
        </div>
      )}

      {phase === 'previewing' && preview && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">พบ <strong>{preview.totalRows}</strong> แถว</span>
              {preview.errors.length > 0
                ? <span className="text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded"><AlertTriangle size={12} className="inline mr-1" />{preview.errors.length} ข้อผิดพลาด</span>
                : <span className="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded"><CheckCircle size={12} className="inline mr-1" />พร้อมนำเข้า</span>
              }
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>เลือกไฟล์ใหม่</Button>
          </div>

          {preview.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-red-700">รายการข้อผิดพลาด</p>
              {preview.errors.slice(0, 20).map((e, i) => (
                <p key={i} className="text-xs text-red-600">แถว {e.row} คอลัมน์ {e.column}: {e.message}</p>
              ))}
              {preview.errors.length > 20 && <p className="text-xs text-red-400">...และอีก {preview.errors.length - 20} รายการ</p>}
            </div>
          )}

          <div className="overflow-auto max-h-96">
            <Table>
              <Thead>
                <Tr>
                  <Th>แถว</Th><Th>รหัส</Th><Th>Lot</Th><Th>วันหมดอายุ</Th>
                  <Th className="text-right">จำนวน</Th><Th className="text-right">ราคา/หน่วย</Th><Th>บริษัท</Th>
                </Tr>
              </Thead>
              <Tbody>
                {preview.rows.map(r => (
                  <Tr key={r.rowNum} className={r.hasError ? 'bg-red-50' : ''}>
                    <Td className="text-gray-400 text-xs">{r.rowNum}{r.hasError && ' ⚠'}</Td>
                    <Td className="font-mono text-sm">{r.productCode}</Td>
                    <Td className="text-sm">{r.lotNo || '-'}</Td>
                    <Td className="text-sm">{r.expireDate || '-'}</Td>
                    <Td className="text-right font-medium">{formatNumber(r.quantity, 0)}</Td>
                    <Td className="text-right text-sm">{r.unitCost ? `฿${formatNumber(r.unitCost)}` : '-'}</Td>
                    <Td className="text-gray-500 text-sm">{r.supplierName || '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
          {preview.totalRows > 50 && (
            <p className="text-xs text-gray-400 text-center">แสดง 50 แถวแรก จาก {preview.totalRows} แถว</p>
          )}

          <div className="flex gap-3">
            <Button onClick={() => doImport(false)} disabled={!preview.canImport || loading}>
              <CheckCircle size={14} /> {loading ? 'กำลังนำเข้า...' : `ยืนยันนำเข้ายอดยกมา (${preview.totalRows} แถว)`}
            </Button>
            {preview.errors.length > 0 && (
              <Button variant="secondary" onClick={() => {
                if (confirm(`มีข้อผิดพลาด ${preview.errors.length} แถว\nต้องการนำเข้าเฉพาะแถวที่ถูกต้องหรือไม่?`)) doImport(true)
              }} disabled={loading}>
                นำเข้าเฉพาะแถวที่ถูกต้อง ({preview.totalRows - preview.errors.length} แถว)
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
