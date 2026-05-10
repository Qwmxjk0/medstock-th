import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import type { Product, Unit, ProductCategory, CreateProductRequest } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { formatNumber } from '../../lib/utils'
import { Plus, Search, Pencil, X, ClipboardList, AlertTriangle } from 'lucide-react'
import { StockCardModal } from './StockCardModal'
import { useUser } from '../../context/UserContext'

export function ProductsPage() {
  const { currentUser, isGuest } = useUser()
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [stockCardProduct, setStockCardProduct] = useState<Product | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const load = useCallback(() => {
    api.getProducts(search, activeOnly).then((p: any) => setProducts(p ?? []))
  }, [search, activeOnly])

  useEffect(() => {
    load()
    api.getUnits(true).then((u: any) => setUnits(u ?? []))
    api.getCategories(true).then((c: any) => setCategories(c ?? []))
  }, [load])

  const openCreate = () => { setEditProduct(null); setFormOpen(true) }
  const openEdit = (p: Product) => { setEditProduct(p); setFormOpen(true) }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">ทะเบียนเวชภัณฑ์</h1>
        {!isGuest && <Button size="sm" onClick={openCreate}><Plus size={14} /> เพิ่มเวชภัณฑ์</Button>}
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500"
            placeholder="ค้นหารหัส/ชื่อเวชภัณฑ์..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} />
          เฉพาะที่ใช้งาน
        </label>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>รหัส</Th>
            <Th>รายการยา/เวชภัณฑ์</Th>
            <Th>ประเภท</Th>
            <Th>หน่วยนับ</Th>
            <Th className="text-right">คงเหลือ</Th>
            <Th className="text-right">จุดสั่งซื้อขั้นต่ำ</Th>
            <Th>สถานะ</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {products.map(p => (
            <Tr key={p.id}>
              <Td className="font-mono text-gray-600">{p.code}</Td>
              <Td className="font-medium">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {p.name}
                  {p.currentStock <= p.reorderLevel && p.currentStock >= 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-normal">ใกล้หมด</span>
                  )}
                  {p.hasNearExpiry && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-normal">ใกล้หมดอายุ</span>
                  )}
                </div>
              </Td>
              <Td className="text-gray-500">{p.categoryName || '-'}</Td>
              <Td className="text-gray-500">{p.baseUnitName}</Td>
              <Td className={`text-right font-medium ${p.currentStock <= p.reorderLevel ? 'text-red-600' : 'text-gray-800'}`}>
                {formatNumber(p.currentStock, 0)}
              </Td>
              <Td className="text-right text-gray-500">{formatNumber(p.reorderLevel, 0)}</Td>
              <Td>
                <span className={`text-xs px-2 py-0.5 rounded ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? 'ใช้งาน' : 'ปิด'}
                </span>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <button onClick={() => setStockCardProduct(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="Stock Card">
                    <ClipboardList size={13} />
                  </button>
                  {!isGuest && <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                    <Pencil size={13} />
                  </button>}
                  {!isGuest && p.isActive && (
                    <button onClick={() => setDeactivateId(p.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {products.length === 0 && (
            <Tr><Td colSpan={8} className="text-center text-gray-400 py-8">ไม่พบเวชภัณฑ์</Td></Tr>
          )}
        </Tbody>
      </Table>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editProduct}
        units={units}
        categories={categories}
        userID={currentUser?.id ?? 1}
        onSaved={() => { setFormOpen(false); load() }}
      />

      {stockCardProduct && (
        <StockCardModal product={stockCardProduct} onClose={() => setStockCardProduct(null)} />
      )}

      <ConfirmDialog
        open={deactivateId !== null}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => { deactivateId && api.deactivateProduct(deactivateId, currentUser?.id ?? 1).then(load) }}
        title="ปิดใช้งานเวชภัณฑ์"
        message="ต้องการปิดใช้งานเวชภัณฑ์นี้? (ข้อมูลยังคงอยู่)"
        danger
        confirmLabel="ปิดใช้งาน"
      />
    </div>
  )
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

interface ProductFormProps {
  open: boolean
  onClose: () => void
  product: Product | null
  units: Unit[]
  categories: ProductCategory[]
  userID: number
  onSaved: () => void
}

function ProductFormModal({ open, onClose, product, units, categories, userID, onSaved }: ProductFormProps) {
  const [form, setForm] = useState<CreateProductRequest>({
    code: '', name: '', categoryId: null, baseUnitId: 0,
    defaultPurchaseUnitId: null, defaultIssueUnitId: null,
    packageSize: 1, reorderLevel: 0, defaultPrice: 0,
  })
  const [duplicates, setDuplicates] = useState<Product[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code,
        name: product.name,
        categoryId: product.categoryId,
        baseUnitId: product.baseUnitId,
        defaultPurchaseUnitId: product.defaultPurchaseUnitId,
        defaultIssueUnitId: product.defaultIssueUnitId,
        packageSize: product.packageSize,
        reorderLevel: product.reorderLevel,
        defaultPrice: product.defaultPrice,
      })
    } else {
      setForm({ code: '', name: '', categoryId: null, baseUnitId: 0, defaultPurchaseUnitId: null, defaultIssueUnitId: null, packageSize: 1, reorderLevel: 0, defaultPrice: 0 })
    }
    setDuplicates([])
    setError('')
  }, [product, open])

  const checkDup = async (name: string) => {
    if (!name) { setDuplicates([]); return }
    const dups = await api.checkDuplicateName(name, product?.id ?? 0) as Product[]
    setDuplicates(dups ?? [])
  }

  const save = async () => {
    setError('')
    try {
      if (product) {
        await api.updateProduct(product.id, form, userID)
      } else {
        await api.createProduct(form, userID)
      }
      onSaved()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const set = (key: keyof CreateProductRequest, value: any) => {
    setForm(p => ({ ...p, [key]: value }))
    if (key === 'name') checkDup(value)
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'แก้ไขเวชภัณฑ์' : 'เพิ่มเวชภัณฑ์'} className="max-w-xl">
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        {duplicates.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>ชื่อนี้คล้ายกับเวชภัณฑ์ที่มีอยู่: {duplicates.map(d => d.code).join(', ')} — กรอกต่อได้ถ้าตั้งใจ</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="รหัสเวชภัณฑ์ *" value={form.code} onChange={e => set('code', e.target.value)} />
          <Select label="กลุ่มยา/ประเภทเวชภัณฑ์" value={form.categoryId ?? ''} onChange={e => set('categoryId', e.target.value ? +e.target.value : null)}>
            <option value="">-- ไม่ระบุ --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <Input label="ชื่อเวชภัณฑ์/รายการยา *" value={form.name} onChange={e => set('name', e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <Select label="หน่วยนับหลัก *" value={form.baseUnitId} onChange={e => set('baseUnitId', +e.target.value)}>
            <option value="">-- เลือก --</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select label="หน่วยนับรับเข้า" value={form.defaultPurchaseUnitId ?? ''} onChange={e => set('defaultPurchaseUnitId', e.target.value ? +e.target.value : null)}>
            <option value="">-- เดียวกับหลัก --</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select label="หน่วยนับเบิก" value={form.defaultIssueUnitId ?? ''} onChange={e => set('defaultIssueUnitId', e.target.value ? +e.target.value : null)}>
            <option value="">-- เดียวกับหลัก --</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="ขนาดบรรจุ" type="number" value={form.packageSize || ''} onChange={e => set('packageSize', e.target.value === '' ? 0 : +e.target.value)} />
          <Input label="จุดสั่งซื้อขั้นต่ำ" type="number" value={form.reorderLevel || ''} onChange={e => set('reorderLevel', e.target.value === '' ? 0 : +e.target.value)} />
          <Input label="ราคาต่อหน่วย (บาท)" type="number" value={form.defaultPrice || ''} onChange={e => set('defaultPrice', e.target.value === '' ? 0 : +e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save}>บันทึก</Button>
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        </div>
      </div>
    </Modal>
  )
}
