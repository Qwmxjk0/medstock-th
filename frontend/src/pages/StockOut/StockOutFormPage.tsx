import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { StockDocument, Department, Product, LotAllocation } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { ProductSearchSelect } from '../../components/ui/ProductSearchSelect'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/Modal'
import { PasswordConfirmModal } from '../../components/ui/PasswordConfirmModal'
import { formatNumber, formatDate, today } from '../../lib/utils'
import { Plus, Trash2, CheckCircle, XCircle, ArrowLeft, Info } from 'lucide-react'
import { useUser } from '../../context/UserContext'

export function StockOutFormPage() {
  const { canWriteStock, currentUser } = useUser()
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [doc, setDoc] = useState<StockDocument | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'cancel' | null>(null)
  const [pwConfirmOpen, setPwConfirmOpen] = useState(false)

  const [docForm, setDocForm] = useState({ documentDate: today(), departmentId: null as number | null, referenceNo: '', note: '' })
  const [newItem, setNewItem] = useState<{ productId: number | null; requestedQty: number; note: string }>({ productId: null, requestedQty: 1, note: '' })
  const [fefoLots, setFefoLots] = useState<LotAllocation[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    Promise.all([api.getDepartments(true), api.getProducts('', false)]).then(([d, p]: any) => {
      setDepartments(d ?? [])
      setProducts(p ?? [])
    })
    if (!isNew && id) api.getDocumentByID(+id).then((d: any) => setDoc(d))
  }, [id])

  const previewFEFO = async (productId: number, qty: number) => {
    if (!productId || qty <= 0) { setFefoLots([]); return }
    const lots = await api.getFEFOLots(productId, qty) as LotAllocation[]
    setFefoLots(lots ?? [])
    const p = products.find(x => x.id === productId) ?? null
    setSelectedProduct(p)
  }

  const createDraft = async () => {
    if (!docForm.departmentId) { setError('กรุณาเลือกหน่วยงาน/แผนก'); return }
    setError('')
    try {
      const newId = await api.createDraft({
        documentType: 'OUT',
        documentDate: docForm.documentDate,
        documentNo: '',
        referenceNo: docForm.referenceNo,
        supplierId: null,
        departmentId: docForm.departmentId,
        note: docForm.note,
        createdBy: currentUser?.id ?? 1,
      }) as number
      navigate(`/stock-out/${newId}`, { replace: true })
    } catch (e: any) { setError(e.message ?? String(e)) }
  }

  const addItem = async () => {
    if (!doc || !newItem.productId) { setError('กรุณาเลือกเวชภัณฑ์'); return }
    if (newItem.requestedQty <= 0) { setError('จำนวนต้องมากกว่า 0'); return }
    setError('')
    try {
      await api.addDocumentItem(doc.id, {
        productId: newItem.productId,
        lotNo: '', expireDate: '',
        quantity: 0,
        requestedQty: newItem.requestedQty,
        approvedQty: newItem.requestedQty,
        unitCost: 0,
        note: newItem.note,
      }, currentUser?.id ?? 0)
      setNewItem({ productId: null, requestedQty: 1, note: '' })
      setFefoLots([])
      refreshDoc()
    } catch (e: any) { setError(e.message ?? String(e)) }
  }

  const removeItem = async (itemId: number) => { await api.removeDocumentItem(itemId, currentUser?.id ?? 0); refreshDoc() }
  const refreshDoc = () => { if (doc) api.getDocumentByID(doc.id).then((d: any) => setDoc(d)) }

  const confirmDoc = async () => {
    setError('')
    try {
      await api.confirmStockOut(doc!.id, currentUser?.id ?? 1)
      refreshDoc()
    } catch (e: any) { setError(e.message ?? String(e)) }
  }

  const cancelDoc = async () => {
    try { await api.cancelDocument(doc!.id, 'ยกเลิกโดยผู้ใช้', currentUser?.id ?? 1); refreshDoc() }
    catch (e: any) { setError(e.message ?? String(e)) }
  }

  const isDraft = doc?.status === 'Draft'

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/stock-out')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-semibold text-gray-800">
          {isNew ? 'สร้างใบเบิกสินค้า' : `ใบเบิกสินค้า: ${doc?.documentNo}`}
        </h1>
        {doc && <StatusBadge status={doc.status} />}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>ผู้ทำรายการ:</span>
        <span className="font-medium text-gray-700">{currentUser?.displayName}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลเอกสาร</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="วันที่เบิกสินค้า *" type="date" value={doc ? doc.documentDate : docForm.documentDate}
            disabled={!isNew} onChange={e => setDocForm(f => ({ ...f, documentDate: e.target.value }))} />
          <Select label="หน่วยงาน *"
            value={doc ? (doc.departmentId ?? '') : (docForm.departmentId ?? '')}
            disabled={!isNew}
            onChange={e => setDocForm(f => ({ ...f, departmentId: e.target.value ? +e.target.value : null }))}>
            <option value="">-- เลือก --</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="เลขที่ใบเบิก (จากเอกสารจริง)"
            value={doc ? doc.referenceNo : docForm.referenceNo}
            disabled={!isNew}
            onChange={e => setDocForm(f => ({ ...f, referenceNo: e.target.value }))} />
          <Input label="หมายเหตุ" value={doc ? doc.note : docForm.note} disabled={!isNew}
            onChange={e => setDocForm(f => ({ ...f, note: e.target.value }))} />
        </div>
        {isNew && <div className="mt-3"><Button onClick={createDraft}>สร้างร่างเอกสาร</Button></div>}
      </div>

      {doc && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">รายการเวชภัณฑ์</h2>

          {isDraft && canWriteStock && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
              <p className="text-xs font-medium text-gray-600">เพิ่มรายการ</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                <div className="col-span-2">
                  <ProductSearchSelect
                    products={products}
                    value={newItem.productId}
                    onChange={p => {
                      const pid = p?.id ?? null
                      setNewItem(i => ({ ...i, productId: pid }))
                      if (pid) previewFEFO(pid, newItem.requestedQty)
                      else setFefoLots([])
                    }}
                    showStock
                  />
                </div>
                <Input label="จำนวนขอ *" type="number" value={newItem.requestedQty || ''}
                  onChange={e => {
                    const qty = e.target.value === '' ? 0 : +e.target.value
                    setNewItem(i => ({ ...i, requestedQty: qty }))
                    if (newItem.productId) previewFEFO(newItem.productId, qty)
                  }} />
                <Input label="หมายเหตุ" value={newItem.note} onChange={e => setNewItem(i => ({ ...i, note: e.target.value }))} />
              </div>
              {fefoLots.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="font-medium text-blue-700 flex items-center gap-1 mb-1"><Info size={11} /> FEFO — ระบบจะตัดจาก lot ดังนี้:</p>
                  <table className="w-full">
                    <thead><tr className="text-blue-600"><th className="text-left">Lot</th><th className="text-left">วันหมดอายุ</th><th className="text-right">คงเหลือ</th><th className="text-right">ตัด</th></tr></thead>
                    <tbody>
                      {fefoLots.map(l => (
                        <tr key={l.lotId} className="text-blue-800">
                          <td>{l.lotNo || '-'}</td>
                          <td>{l.expireDate || '-'}</td>
                          <td className="text-right">{formatNumber(l.available)}</td>
                          <td className="text-right font-semibold">{formatNumber(l.allocate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Button size="sm" onClick={addItem}><Plus size={13} /> เพิ่ม</Button>
            </div>
          )}

          <Table>
            <Thead>
              <Tr><Th>สินค้า</Th><Th className="text-right">ขอ</Th><Th className="text-right">อนุมัติ</Th><Th className="text-right">จ่ายจริง</Th><Th>หมายเหตุ</Th>{isDraft && canWriteStock && <Th></Th>}</Tr>
            </Thead>
            <Tbody>
              {(doc.items ?? []).map(it => (
                <Tr key={it.id}>
                  <Td><p className="font-medium">{it.productName}</p><p className="text-xs text-gray-400">{it.productCode}</p></Td>
                  <Td className="text-right">{formatNumber(it.requestedQty)}</Td>
                  <Td className="text-right">{formatNumber(it.approvedQty)}</Td>
                  <Td className="text-right font-medium text-green-700">{it.issuedQty > 0 ? formatNumber(it.issuedQty) : '-'}</Td>
                  <Td className="text-gray-500 text-xs">{it.note || '-'}</Td>
                  {isDraft && canWriteStock && <Td><button onClick={() => removeItem(it.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={13} /></button></Td>}
                </Tr>
              ))}
              {(doc.items ?? []).length === 0 && (
                <Tr><Td colSpan={isDraft ? 6 : 5} className="text-center text-gray-400 py-4">ยังไม่มีรายการ</Td></Tr>
              )}
            </Tbody>
          </Table>
        </div>
      )}

      {doc && isDraft && canWriteStock && (
        <div className="flex gap-3">
          <Button onClick={() => setPwConfirmOpen(true)}><CheckCircle size={15} /> ยืนยันเบิกสินค้า</Button>
          <Button variant="danger" onClick={() => setConfirmAction('cancel')}><XCircle size={15} /> ยกเลิกเอกสาร</Button>
        </div>
      )}

      <PasswordConfirmModal
        open={pwConfirmOpen}
        title="ยืนยันเบิกสินค้า"
        description={`เบิกเวชภัณฑ์ ${doc?.items?.length ?? 0} รายการ — ระบบจะตัดสต๊อกตาม FEFO ทันที`}
        onConfirmed={() => { setPwConfirmOpen(false); confirmDoc() }}
        onCancel={() => setPwConfirmOpen(false)}
      />
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={cancelDoc}
        title="ยกเลิกเอกสาร"
        message="ต้องการยกเลิกเอกสารนี้?"
        danger confirmLabel="ยกเลิกเอกสาร"
      />
    </div>
  )
}

