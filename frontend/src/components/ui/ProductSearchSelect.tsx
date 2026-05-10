import { useState, useRef, useEffect } from 'react'
import type { Product } from '../../types/models'
import { formatNumber } from '../../lib/utils'

interface Props {
  products: Product[]
  value: number | null
  onChange: (product: Product | null) => void
  label?: string
  showStock?: boolean
}

export function ProductSearchSelect({ products, value, onChange, label = 'เวชภัณฑ์ *', showStock = false }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = products.find(p => p.id === value) ?? null

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim() === ''
    ? products.filter(p => p.isActive)
    : products.filter(p =>
        p.isActive && (
          p.code.toLowerCase().includes(query.toLowerCase()) ||
          p.name.toLowerCase().includes(query.toLowerCase())
        )
      )

  const select = (p: Product) => {
    onChange(p)
    setOpen(false)
    setQuery('')
  }

  const clear = () => {
    onChange(null)
    setQuery('')
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>

      {selected && !open ? (
        <div className="flex items-center gap-1 border border-gray-300 rounded-md px-2 py-1.5 bg-white text-sm min-h-[34px]">
          <span className="flex-1 truncate">
            <span className="font-mono text-gray-500 text-xs mr-1">{selected.code}</span>
            {selected.name}
            {showStock && <span className="ml-2 text-gray-400 text-xs">(คงเหลือ: {formatNumber(selected.currentStock, 0)})</span>}
          </span>
          <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600 shrink-0 text-xs px-1">✕</button>
        </div>
      ) : (
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="พิมพ์รหัสหรือชื่อเพื่อค้นหา..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">ไม่พบเวชภัณฑ์</div>
          ) : (
            filtered.slice(0, 50).map(p => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                onClick={() => select(p)}
              >
                <span className="font-mono text-xs text-gray-400 w-20 shrink-0">{p.code}</span>
                <span className="flex-1 truncate">{p.name}</span>
                {showStock && (
                  <span className={`text-xs shrink-0 ${p.currentStock <= p.reorderLevel ? 'text-red-500' : 'text-gray-400'}`}>
                    {formatNumber(p.currentStock, 0)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
