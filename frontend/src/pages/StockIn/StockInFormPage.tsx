import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { StockDocument, Supplier, Product, Unit, DocumentItemRequest } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { ProductSearchSelect } from '../../components/ui/ProductSearchSelect'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/Modal'
import { PasswordConfirmModal } from '../../components/ui/PasswordConfirmModal'
import { formatNumber, formatDate, today } from '../../lib/utils'
import { Plus, Trash2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { useUser } from '../../context/UserContext'

export function StockInFormPage() {
  const { canWriteStock, currentUser } = useUser()
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [doc, setDoc] = useState<StockDocument | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'cancel' | null>(null)
  const [pwConfirmOpen, setPwConfirmOpen] = useState(false)

  // New item form state
  const [newItem, setNewItem] = useState<Partial<DocumentItemRequest>>({ quantity: 1, unitCost: 0 })
  const [docForm, setDocForm] = useState({
    documentDate: today(), supplierId: null as number | null,
    referenceNo: '', note: '',
  })

  useEffect(() => {
    Promise.all([
      api.getSuppliers(true),
      api.getProducts('', false),
      api.getUnits(true),
    ]).then(([s, p, u]: any) => {
      setSuppliers(s ?? [])
      setProducts(p ?? [])
      setUnits(u ?? [])
    })

    if (!isNew && id) {
      api.getDocumentByID(+id).then((d: any) => setDoc(d))
    }
  }, [id])

  const createDraft = async () => {
    if (!docForm.supplierId) { setError('กรุณาเลือกบริษัท'); return }
    setError('')
    try {
      const newId = await api.createDraft({
        documentType: 'IN',
        documentDate: docForm.documentDate,
        documentNo: '',
        referenceNo: docForm.referenceNo,
        supplierId: docForm.supplierId,
        departmentId: null,
        note: docForm.note,
        createdBy: currentUser?.id ?? 1,
      }) as number
      navigate(`/stock-in/${newId}`, { replace: true })
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const addItem = async () => {
    if (!doc) return
    if (!newItem.productId) { setError('กรุณาเลือกเวชภัณฑ์'); return }
    if (!newItem.quantity || newItem.quantity <= 0) { setError('จำนวนต้องมากกว่า 0'); return }
    setError('')
    try {
      await api.addDocumentItem(doc.id, {
        productId: newItem.productId!,
        lotNo: newItem.lotNo ?? '',
        expireDate: newItem.expireDate ?? '',
        quantity: newItem.quantity ?? 0,
        requestedQty: 0,
        approvedQty: 0,
        unitCost: newItem.unitCost ?? 0,
        note: newItem.note ?? '',
      })
      setNewItem({ quantity: 1, unitCost: 0 })
      refreshDoc()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const removeItem = async (itemId: number) => {
    await api.removeDocumentItem(itemId)
    refreshDoc()
  }

  const refreshDoc = () => {
    if (doc) api.getDocumentByID(doc.id).then((d: any) => setDoc(d))
  }

  const confirmDoc = async () => {
    if (!doc) return
    setError('')
    try {
      await api.confirmStockIn(doc.id, currentUser?.id ?? 1)
      refreshDoc()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const cancelDoc = async () => {
    if (!doc) return
    setError('')
    try {
      await api.cancelDocument(doc.id, 'ยกเลิกโดยผู้ใช้', currentUser?.id ?? 1)
      refreshDoc()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const isDraft = doc?.status === 'Draft'

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/stock-in')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {isNew ? 'สร้างใบรับสินค้า' : `ใบรับสินค้า: ${doc?.documentNo}`}
        </h1>
        {doc && <StatusBadge status={doc.status} />}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {/* Current user */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>ผู้ทำรายการ:</span>
        <span className="font-medium text-gray-700">{currentUser?.displayName}</span>
      </div>

      {/* Document header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลเอกสาร</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="วันที่รับสินค้า *" type="date" value={doc ? doc.documentDate : docForm.documentDate}
            disabled={!isNew} onChange={e => setDocForm(f => ({ ...f, documentDate: e.target.value }))} />
          <Select label="บริษัท *"
            value={doc ? (doc.supplierId ?? '') : (docForm.supplierId ?? '')}
            disabled={!isNew}
            onChange={e => setDocForm(f => ({ ...f, supplierId: e.target.value ? +e.target.value : null }))}>
            <option value="">-- เลือก --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="เลข Invoice (จากเอกสารจริง)"
            value={doc ? doc.referenceNo : docForm.referenceNo}
            disabled={!isNew}
            onChange={e => setDocForm(f => ({ ...f, referenceNo: e.target.value }))} />
          <Input label="หมายเหตุ"
            value={doc ? doc.note : docForm.note}
            disabled={!isNew}
            onChange={e => setDocForm(f => ({ ...f, note: e.target.value }))} />
        </div>
        {isNew && (
          <div className="mt-3">
            <Button onClick={createDraft}>สร้างร่างเอกสาร</Button>
          </div>
        )}
      </div>

      {/* Items */}
      {doc && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">รายการเวชภัณฑ์</h2>

          {isDraft && canWriteStock && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">เพิ่มรายการ</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                <div className="col-span-2">
                  <ProductSearchSelect
                    products={products}
                    value={newItem.productId ?? null}
                    onChange={p => setNewItem(i => ({ ...i, productId: p?.id ?? undefined, unitCost: p?.defaultPrice ?? 0 }))}
                  />
                </div>
                <Input label="Lot No." value={newItem.lotNo ?? ''} onChange={e => setNewItem(i => ({ ...i, lotNo: e.target.value }))} />
                <Input label="วันหมดอายุ" type="date" value={newItem.expireDate ?? ''} onChange={e => setNewItem(i => ({ ...i, expireDate: e.target.value }))} />
                <Input label="จำนวน *" type="number" value={newItem.quantity || ''} onChange={e => setNewItem(i => ({ ...i, quantity: e.target.value === '' ? undefined : +e.target.value }))} />
                <Input label="ราคา/หน่วย" type="number" value={newItem.unitCost || ''} onChange={e => setNewItem(i => ({ ...i, unitCost: e.target.value === '' ? undefined : +e.target.value }))} />
              </div>
              <Button size="sm" className="mt-2" onClick={addItem}><Plus size={13} /> เพิ่ม</Button>
            </div>
          )}

          <Table>
            <Thead>
              <Tr>
                <Th>สินค้า</Th><Th>Lot</Th><Th>วันหมดอายุ</Th>
                <Th className="text-right">จำนวน</Th><Th className="text-right">ราคา/หน่วย</Th>
                <Th className="text-right">มูลค่า</Th>{isDraft && <Th></Th>}
              </Tr>
            </Thead>
            <Tbody>
              {(doc.items ?? []).map(it => (
                <Tr key={it.id}>
                  <Td><p className="font-medium">{it.productName}</p><p className="text-xs text-gray-400">{it.productCode}</p></Td>
                  <Td>{it.lotNo || '-'}</Td>
                  <Td className="text-sm">{it.expireDate ? formatDate(it.expireDate) : '-'}</Td>
                  <Td className="text-right">{formatNumber(it.quantity)}</Td>
                  <Td className="text-right">฿{formatNumber(it.unitCost)}</Td>
                  <Td className="text-right font-medium">฿{formatNumber(it.quantity * it.unitCost)}</Td>
                  {isDraft && canWriteStock && (
                    <Td>
                      <button onClick={() => removeItem(it.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </Td>
                  )}
                </Tr>
              ))}
              {(doc.items ?? []).length === 0 && (
                <Tr><Td colSpan={isDraft ? 7 : 6} className="text-center text-gray-400 py-4">ยังไม่มีรายการ</Td></Tr>
              )}
              {(doc.items ?? []).length > 0 && (
                <Tr>
                  <Td colSpan={isDraft ? 5 : 4} className="text-right font-semibold text-gray-700">รวมมูลค่า</Td>
                  <Td className="text-right font-bold text-gray-900">฿{formatNumber(doc.totalValue)}</Td>
                  {isDraft && <Td />}
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      )}

      {/* Actions */}
      {doc && isDraft && canWriteStock && (
        <div className="flex gap-3">
          <Button onClick={() => setPwConfirmOpen(true)} className="gap-2">
            <CheckCircle size={15} /> ยืนยันรับสินค้า
          </Button>
          <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
            <XCircle size={15} /> ยกเลิกเอกสาร
          </Button>
        </div>
      )}

      <PasswordConfirmModal
        open={pwConfirmOpen}
        title="ยืนยันรับสินค้า"
        description={`รับสินค้า ${doc?.items?.length ?? 0} รายการ — เมื่อยืนยันแล้วจะอัปเดตสต๊อกทันที`}
        onConfirmed={() => { setPwConfirmOpen(false); confirmDoc() }}
        onCancel={() => setPwConfirmOpen(false)}
      />
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={cancelDoc}
        title="ยกเลิกเอกสาร"
        message="ต้องการยกเลิกเอกสารนี้?"
        danger
        confirmLabel="ยกเลิกเอกสาร"
      />
    </div>
  )
}

