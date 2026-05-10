import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import type { Product, StockMovement } from '../../types/models'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ProductSearchSelect } from '../../components/ui/ProductSearchSelect'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { formatNumber, today } from '../../lib/utils'
import { Download } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const typeLabel: Record<string, string> = {
  IN: 'รับเข้า', OUT: 'เบิกออก', ADJUST: 'ปรับปรุง',
  OPENING: 'ยอดยกมา', REVERSAL: 'ยกเลิก',
}

export function StockCardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getProducts('', false).then((p: any) => setProducts(p ?? []))
  }, [])

  const load = () => {
    if (!selectedId) return
    setLoading(true)
    api.getStockCard(selectedId, dateFrom, dateTo).then((m: any) => setMovements(m ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { if (selectedId) load() }, [selectedId])

  const selectedProduct = products.find(p => p.id === selectedId)

  const exportXlsx = async () => {
    if (!selectedProduct) return
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const destPath = await api.saveFileDialog(`stock-card-${selectedProduct.name}-${ts}.xlsx`) as string
    if (!destPath) return
    try {
      const path = await api.exportStockCard(selectedProduct.id, selectedProduct.name, dateFrom, dateTo, destPath) as string
      alert(`บันทึกไฟล์แล้ว:\n${path}`)
    } catch (e: any) { alert('ส่งออกไม่สำเร็จ: ' + (e.message ?? e)) }
  }

  // Build chart data from movements — one point per movement, show productBalanceAfter
  const chartData = movements.map((m, i) => ({
    idx: i + 1,
    label: m.createdAt.slice(5, 10), // MM-DD
    balance: m.productBalanceAfter,
    type: m.movementType,
  }))

  const reorderLevel = selectedProduct?.reorderLevel ?? 0

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Stock Card</h1>
      <div className="flex gap-3 items-end flex-wrap">
        <div className="min-w-72">
          <ProductSearchSelect
            products={products}
            value={selectedId}
            onChange={p => setSelectedId(p?.id ?? null)}
            label="เลือกเวชภัณฑ์"
            showStock
          />
        </div>
        <Input label="จากวันที่ (ว่าง = ตั้งแต่ต้น)" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input label="ถึงวันที่" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <Button onClick={load} variant="secondary" className="self-end">ค้นหา</Button>
        {selectedId && <Button onClick={exportXlsx} variant="outline" className="self-end"><Download size={14} /> Export</Button>}
      </div>

      {selectedProduct && (
        <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
          <span className="font-medium">{selectedProduct.code}</span> — {selectedProduct.name} |
          คงเหลือ: <span className="font-bold text-blue-700">{formatNumber(selectedProduct.currentStock, 0)} {selectedProduct.baseUnitName}</span>
          {reorderLevel > 0 && <span className="ml-2 text-orange-600">| จุดสั่งซื้อ: {formatNumber(reorderLevel, 0)}</span>}
        </div>
      )}

      {/* Balance chart */}
      {!loading && chartData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">กราฟยอดคงเหลือ</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(val: any) => [formatNumber(Number(val), 0), 'ยอดคงเหลือ']}
                labelFormatter={l => `วันที่ ${l}`}
              />
              {reorderLevel > 0 && (
                <ReferenceLine
                  y={reorderLevel}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{ value: `จุดสั่ง ${formatNumber(reorderLevel, 0)}`, position: 'insideTopRight', fontSize: 10, fill: '#f97316' }}
                />
              )}
              <Line
                type="stepAfter"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const color = payload.type === 'IN' || payload.type === 'OPENING' ? '#22c55e'
                    : payload.type === 'OUT' ? '#ef4444'
                    : '#f59e0b'
                  return <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1} />
                }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />รับเข้า</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />เบิกออก</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />ปรับปรุง</span>
            {reorderLevel > 0 && <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-orange-500 inline-block" />จุดสั่งซื้อ</span>}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>วันที่/เวลา</Th>
              <Th>ประเภท</Th>
              <Th>เลขเอกสาร</Th>
              <Th>Lot</Th>
              <Th>วันหมดอายุ</Th>
              <Th className="text-right">เข้า</Th>
              <Th className="text-right">ออก</Th>
              <Th className="text-right">คงเหลือ(Lot)</Th>
              <Th className="text-right">คงเหลือ(รวม)</Th>
              <Th>ผู้ทำรายการ</Th>
            </Tr>
          </Thead>
          <Tbody>
            {movements.map(m => (
              <Tr key={m.id}>
                <Td className="text-xs text-gray-500">{m.createdAt.slice(0, 16)}</Td>
                <Td>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    m.movementType === 'IN' || m.movementType === 'OPENING' ? 'bg-green-100 text-green-700' :
                    m.movementType === 'OUT' ? 'bg-red-100 text-red-700' :
                    m.movementType === 'REVERSAL' ? 'bg-gray-100 text-gray-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>{typeLabel[m.movementType] ?? m.movementType}</span>
                </Td>
                <Td className="font-mono text-xs">{m.documentNo}</Td>
                <Td>{m.lotNo || '-'}</Td>
                <Td className="text-xs">{m.expireDate || '-'}</Td>
                <Td className="text-right text-green-700 font-medium">{m.quantityIn > 0 ? formatNumber(m.quantityIn) : ''}</Td>
                <Td className="text-right text-red-600 font-medium">{m.quantityOut > 0 ? formatNumber(m.quantityOut) : ''}</Td>
                <Td className="text-right">{formatNumber(m.lotBalanceAfter)}</Td>
                <Td className="text-right font-bold">{formatNumber(m.productBalanceAfter)}</Td>
                <Td className="text-xs text-gray-500">{m.createdByName}</Td>
              </Tr>
            ))}
            {movements.length === 0 && selectedId && (
              <Tr><Td colSpan={10} className="text-center text-gray-400 py-8">ไม่มีข้อมูล</Td></Tr>
            )}
            {!selectedId && (
              <Tr><Td colSpan={10} className="text-center text-gray-300 py-8">กรุณาเลือกสินค้า</Td></Tr>
            )}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
