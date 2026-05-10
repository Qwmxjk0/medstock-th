import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import type { Product, StockLot, AdjustmentItemRequest } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { formatNumber, today } from '../../lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import { PasswordConfirmModal } from '../../components/ui/PasswordConfirmModal'

export function AdjustmentPage() {
  const { canWriteStock, currentUser } = useUser()
  const [products, setProducts] = useState<Product[]>([])
  const [lots, setLots] = useState<StockLot[]>([])
  const [items, setItems] = useState<AdjustmentItemRequest[]>([])
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [documentDate, setDocumentDate] = useState(today())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pwConfirmOpen, setPwConfirmOpen] = useState(false)
  const [newItem, setNewItem] = useState<Partial<AdjustmentItemRequest & { productId: number }>>({ quantity: 0 })

  useEffect(() => {
    api.getProducts('', false).then((p: any) => setProducts(p ?? []))
  }, [])

  const loadLots = async (productId: number) => {
    const l = await api.getStockLots(productId) as StockLot[]
    setLots(l ?? [])
  }

  const addItem = () => {
    if (!newItem.productId) { setError('กรุณาเลือกเวชภัณฑ์'); return }
    setError('')
    const item: AdjustmentItemRequest = {
      productId: newItem.productId,
      lotId: newItem.lotId ?? null,
      lotNo: newItem.lotNo ?? '',
      expireDate: newItem.expireDate ?? '',
      quantity: newItem.quantity ?? 0,
      note: newItem.note ?? '',
    }
    setItems(prev => [...prev, item])
    setNewItem({ quantity: 0 })
    setLots([])
  }

  const submit = async () => {
    if (!reason) { setError('กรุณาระบุเหตุผลการตัดปรับสต๊อก'); return }
    if (items.length === 0) { setError('ต้องมีอย่างน้อย 1 รายการ'); return }
    setError('')
    try {
      const docId = await api.createAdjustment({
        documentDate,
        note,
        reason,
        createdBy: currentUser?.id ?? 1,
        items,
      }) as number
      setSuccess(`บันทึกการตัดปรับสต๊อกสำเร็จ (เอกสาร #${docId})`)
      setItems([])
      setReason('')
      setNote('')
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-xl font-semibold text-gray-800">ตัดปรับสต๊อก</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">{success}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">ข้อมูลการตัดปรับ</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="วันที่" type="date" value={documentDate} onChange={e => setDocumentDate(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-gray-700">ผู้ทำรายการ</label>
            <p className="mt-1 px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md">{currentUser?.displayName}</p>
          </div>
        </div>
        <Textarea label="เหตุผล *" value={reason} onChange={e => setReason(e.target.value)} placeholder="เหตุผลการตัดปรับสต๊อก (บังคับ)" />
        <Textarea label="หมายเหตุ" value={note} onChange={e => setNote(e.target.value)} placeholder="หมายเหตุเพิ่มเติม" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">รายการ</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">เพิ่มรายการ</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <div className="col-span-2">
              <Select label="เวชภัณฑ์ *" value={newItem.productId ?? ''}
                onChange={e => {
                  const pid = +e.target.value
                  setNewItem(i => ({ ...i, productId: pid, lotId: null, lotNo: '', expireDate: '' }))
                  if (pid) loadLots(pid)
                }}>
                <option value="">-- เลือกเวชภัณฑ์ --</option>
                {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
              </Select>
            </div>
            {lots.length > 0 ? (
              <Select label="Lot" value={newItem.lotId ?? ''}
                onChange={e => {
                  const l = lots.find(x => x.id === +e.target.value)
                  setNewItem(i => ({ ...i, lotId: l?.id, lotNo: l?.lotNo ?? '', expireDate: l?.expireDate ?? '', quantity: l?.quantityOnHand ?? 0 }))
                }}>
                <option value="">-- ใหม่/ไม่ระบุ --</option>
                {lots.map(l => <option key={l.id} value={l.id}>Lot: {l.lotNo || '-'} ({formatNumber(l.quantityOnHand, 0)})</option>)}
              </Select>
            ) : (
              <Input label="Lot No." value={newItem.lotNo ?? ''} onChange={e => setNewItem(i => ({ ...i, lotNo: e.target.value }))} />
            )}
            <Input label="จำนวนคงเหลือที่ถูกต้อง *" type="number" value={newItem.quantity || ''}
              onChange={e => setNewItem(i => ({ ...i, quantity: e.target.value === '' ? undefined : +e.target.value }))} />
          </div>
          <Button size="sm" onClick={addItem}><Plus size={13} /> เพิ่ม</Button>
        </div>

        <Table>
          <Thead>
            <Tr><Th>รายการยา/เวชภัณฑ์</Th><Th>Lot</Th><Th className="text-right">จำนวนที่ถูกต้อง</Th><Th></Th></Tr>
          </Thead>
          <Tbody>
            {items.map((it, i) => (
              <Tr key={i}>
                <Td>{productMap[it.productId]?.name ?? `ID: ${it.productId}`}</Td>
                <Td>{it.lotNo || '-'}</Td>
                <Td className="text-right font-medium">{formatNumber(it.quantity)}</Td>
                <Td>
                  <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-red-50 text-red-400">
                    <Trash2 size={13} />
                  </button>
                </Td>
              </Tr>
            ))}
            {items.length === 0 && <Tr><Td colSpan={4} className="text-center text-gray-400 py-4">ยังไม่มีรายการ</Td></Tr>}
          </Tbody>
        </Table>
      </div>

      {items.length > 0 && canWriteStock && (
        <Button onClick={() => setPwConfirmOpen(true)}>บันทึกการตัดปรับสต๊อก</Button>
      )}
      {!canWriteStock && (
        <p className="text-xs text-gray-400 italic">* ผู้เยี่ยมชมไม่สามารถบันทึกรายการได้</p>
      )}

      <PasswordConfirmModal
        open={pwConfirmOpen}
        title="ยืนยันตัดปรับสต๊อก"
        description={`ปรับสต๊อก ${items.length} รายการ — การดำเนินการนี้ไม่สามารถยกเลิกได้`}
        onConfirmed={() => { setPwConfirmOpen(false); submit() }}
        onCancel={() => setPwConfirmOpen(false)}
      />
    </div>
  )
}

