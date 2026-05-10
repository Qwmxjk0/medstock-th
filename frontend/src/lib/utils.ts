import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function formatNumber(n: number, decimals = 2) {
  if (n === null || n === undefined) return '0'
  return n.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatCurrency(n: number) {
  return '฿' + formatNumber(n)
}

export function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysFromNow(expireDate: string): number {
  if (!expireDate) return 9999
  const diff = new Date(expireDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
