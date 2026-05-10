import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { DashboardSummary, LowStockItem, ExpiryAlert } from '../../types/models'
import { formatNumber, formatCurrency, formatDate } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AlertTriangle, Package, TrendingDown, DollarSign, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface ChartPoint { date: string; totalIn: number; totalOut: number }

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [expiry, setExpiry] = useState<ExpiryAlert[]>([])
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary(),
      api.getLowStockAlerts(),
      api.getNearExpiryAlerts(180),
      api.getMovementChart(30),
    ]).then(([s, l, e, c]: any) => {
      if (s) setSummary({ ...s, recentDocuments: s.recentDocuments ?? [] })
      setLowStock(l ?? [])
      setExpiry(e ?? [])
      setChart((c ?? []).map((p: ChartPoint) => ({
        ...p,
        date: p.date.slice(5), // "MM-DD"
      })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400">กำลังโหลด...</div>

  const stats = [
    { label: 'เวชภัณฑ์ใกล้หมด', value: summary?.lowStockCount ?? 0, icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'หมดสต๊อก', value: summary?.outOfStockCount ?? 0, icon: Package, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'ใกล้หมดอายุ (6 เดือน)', value: summary?.nearExpiryCount ?? 0, icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'มูลค่าสต๊อกรวม', value: formatCurrency(summary?.totalStockValue ?? 0), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'รับเข้าวันนี้', value: summary?.todayInCount ?? 0, icon: ArrowDownToLine, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'เบิกออกวันนี้', value: summary?.todayOutCount ?? 0, icon: ArrowUpFromLine, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ]

  const hasActivity = chart.some(p => p.totalIn > 0 || p.totalOut > 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">หน้าหลัก</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.bg} flex flex-col gap-1`}>
            <s.icon size={18} className={s.color} />
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Movement Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <ArrowDownToLine size={14} className="text-blue-500" />
          ความเคลื่อนไหวสต๊อก 30 วันล่าสุด
        </h2>
        {!hasActivity ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            ยังไม่มีข้อมูลความเคลื่อนไหว
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
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
                formatter={(val: any, name: any) => [
                  formatNumber(Number(val), 0),
                  name === 'totalIn' ? 'รับเข้า' : 'เบิกออก',
                ]}
                labelFormatter={l => `วันที่ ${l}`}
              />
              <Legend
                formatter={v => v === 'totalIn' ? 'รับเข้า' : 'เบิกออก'}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area type="monotone" dataKey="totalIn" stroke="#3b82f6" strokeWidth={2}
                fill="url(#gradIn)" dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="totalOut" stroke="#f97316" strokeWidth={2}
                fill="url(#gradOut)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingDown size={14} className="text-orange-500" /> เวชภัณฑ์ใกล้หมด/หมดสต๊อก
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-xs text-gray-400">ไม่มีเวชภัณฑ์ใกล้หมด</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr><th className="text-left pb-1">รายการยา/เวชภัณฑ์</th><th className="text-right pb-1">คงเหลือ</th><th className="text-right pb-1">จุดสั่ง</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lowStock.slice(0, 8).map(it => (
                  <tr key={it.productId}>
                    <td className="py-1.5">
                      <p className="font-medium text-gray-800">{it.productName}</p>
                      <p className="text-gray-400">{it.productCode}</p>
                    </td>
                    <td className="text-right py-1.5 font-semibold text-red-600">{formatNumber(it.currentStock, 0)} {it.unitName}</td>
                    <td className="text-right py-1.5 text-gray-400">{formatNumber(it.reorderLevel, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Near expiry */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500" /> ใกล้หมดอายุ (6 เดือน)
          </h2>
          {expiry.length === 0 ? (
            <p className="text-xs text-gray-400">ไม่มีเวชภัณฑ์ใกล้หมดอายุ</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr><th className="text-left pb-1">รายการยา / Lot</th><th className="text-right pb-1">หมดอายุ</th><th className="text-right pb-1">คงเหลือ</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expiry.slice(0, 8).map(a => (
                  <tr key={a.lotId}>
                    <td className="py-1.5">
                      <p className="font-medium text-gray-800">{a.productName}</p>
                      <p className="text-gray-400">Lot: {a.lotNo || '-'}</p>
                    </td>
                    <td className="text-right py-1.5">
                      <p className={a.daysLeft <= 7 ? 'text-red-600 font-semibold' : 'text-yellow-600'}>{formatDate(a.expireDate)}</p>
                      <p className="text-gray-400">{a.daysLeft} วัน</p>
                    </td>
                    <td className="text-right py-1.5 text-gray-700">{formatNumber(a.quantity, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">เอกสารล่าสุด</h2>
        {(summary?.recentDocuments ?? []).length === 0 ? (
          <p className="text-xs text-gray-400">ยังไม่มีเอกสาร</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left pb-1">เลขเอกสาร</th>
                <th className="text-left pb-1">ประเภท</th>
                <th className="text-left pb-1">วันที่</th>
                <th className="text-left pb-1">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(summary?.recentDocuments ?? []).map(d => (
                <tr key={d.id}>
                  <td className="py-1.5 font-medium text-gray-800">{d.documentNo}</td>
                  <td className="py-1.5 text-gray-500">{d.documentType}</td>
                  <td className="py-1.5 text-gray-500">{formatDate(d.documentDate)}</td>
                  <td className="py-1.5"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
