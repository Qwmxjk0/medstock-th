import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import type { Product, StockMovement } from '../../types/models'
import { Modal } from '../../components/ui/Modal'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatNumber, today } from '../../lib/utils'
import { Download } from 'lucide-react'

const typeLabel: Record<string, string> = {
  IN: 'รับเข้า', OUT: 'เบิกออก', ADJUST: 'ปรับปรุง',
  OPENING: 'ยอดยกมา', REVERSAL: 'ยกเลิก',
}

export function StockCardModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.getStockCard(product.id, dateFrom, dateTo).then((m: any) => setMovements(m ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const exportXlsx = async () => {
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const destPath = await api.saveFileDialog(`stock-card-${product.name}-${ts}.xlsx`) as string
    if (!destPath) return
    try {
      const path = await api.exportStockCard(product.id, product.name, dateFrom, dateTo, destPath) as string
      alert(`บันทึกไฟล์แล้ว:\n${path}`)
    } catch (e: any) {
      alert('ส่งออกไม่สำเร็จ: ' + (e.message ?? e))
    }
  }

  return (
    <Modal open onClose={onClose} title={`Stock Card: ${product.code} - ${product.name}`} className="max-w-5xl">
      <div className="space-y-3">
        <div className="flex gap-3 items-end">
          <Input label="จากวันที่" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input label="ถึงวันที่" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <Button onClick={load} variant="secondary">ค้นหา</Button>
          <Button onClick={exportXlsx} variant="outline"><Download size={14} /> Export</Button>
        </div>
        {loading ? (
          <p className="text-gray-400 text-sm">กำลังโหลด...</p>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>วันที่</Th>
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
                  <Td className="text-gray-500 text-xs">{m.createdAt.slice(0, 16)}</Td>
                  <Td><span className="text-xs font-medium">{typeLabel[m.movementType] ?? m.movementType}</span></Td>
                  <Td className="font-mono text-xs text-gray-600">{m.documentNo}</Td>
                  <Td className="text-gray-600">{m.lotNo || '-'}</Td>
                  <Td className="text-gray-600 text-xs">{m.expireDate || '-'}</Td>
                  <Td className="text-right text-green-700">{m.quantityIn > 0 ? formatNumber(m.quantityIn) : ''}</Td>
                  <Td className="text-right text-red-600">{m.quantityOut > 0 ? formatNumber(m.quantityOut) : ''}</Td>
                  <Td className="text-right font-medium">{formatNumber(m.lotBalanceAfter)}</Td>
                  <Td className="text-right font-bold">{formatNumber(m.productBalanceAfter)}</Td>
                  <Td className="text-gray-500 text-xs">{m.createdByName}</Td>
                </Tr>
              ))}
              {movements.length === 0 && (
                <Tr><Td colSpan={10} className="text-center text-gray-400 py-6">ไม่มีข้อมูล</Td></Tr>
              )}
            </Tbody>
          </Table>
        )}
      </div>
    </Modal>
  )
}
