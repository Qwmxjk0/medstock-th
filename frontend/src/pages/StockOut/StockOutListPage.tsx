import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { StockDocument, DocFilter } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, Thead, Tbody, Th, Td, Tr } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatDate } from '../../lib/utils'
import { Plus } from 'lucide-react'
import { useUser } from '../../context/UserContext'

export function StockOutListPage() {
  const navigate = useNavigate()
  const { isGuest } = useUser()
  const [docs, setDocs] = useState<StockDocument[]>([])
  const [filter, setFilter] = useState<DocFilter>({ documentType: 'OUT', status: '', dateFrom: '', dateTo: '', search: '' })

  useEffect(() => {
    api.getDocuments(filter).then((d: any) => setDocs(d ?? []))
  }, [filter])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">ใบเบิกสินค้า</h1>
        {!isGuest && <Button size="sm" onClick={() => navigate('/stock-out/new')}><Plus size={14} /> สร้างใบเบิกสินค้า</Button>}
      </div>
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="ค้นหาเลขเอกสาร/หน่วยงาน" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <Input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} />
        <Input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} />
        <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">ทุกสถานะ</option>
          <option value="Draft">ร่าง</option>
          <option value="Confirmed">ยืนยัน</option>
          <option value="Cancelled">ยกเลิก</option>
        </select>
      </div>
      <Table>
        <Thead>
          <Tr><Th>เลขเอกสาร</Th><Th>วันที่เบิกสินค้า</Th><Th>หน่วยงาน</Th><Th>สถานะ</Th><Th>ผู้สร้าง</Th><Th>ผู้ยืนยัน</Th></Tr>
        </Thead>
        <Tbody>
          {docs.map(d => (
            <Tr key={d.id} onClick={() => navigate(`/stock-out/${d.id}`)}>
              <Td className="font-mono font-medium">{d.documentNo}</Td>
              <Td>{formatDate(d.documentDate)}</Td>
              <Td>{d.departmentName || '-'}</Td>
              <Td><StatusBadge status={d.status} /></Td>
              <Td className="text-gray-500 text-xs">{d.createdByName}</Td>
              <Td className="text-gray-500 text-xs">{d.confirmedByName || '-'}</Td>
            </Tr>
          ))}
          {docs.length === 0 && (
            <Tr><Td colSpan={6} className="text-center text-gray-400 py-8">ไม่มีเอกสาร</Td></Tr>
          )}
        </Tbody>
      </Table>
    </div>
  )
}
