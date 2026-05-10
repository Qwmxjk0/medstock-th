import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface Progress {
  step: number
  total: number
  message: string
}

export function LoadingScreen({ onReady }: { onReady: () => void }) {
  const [progress, setProgress] = useState<Progress>({ step: 0, total: 6, message: 'กำลังเริ่มต้น...' })
  const [error, setError] = useState('')

  useEffect(() => {
    // Listen to progress events from Go
    const win = window as any
    let unlisten: (() => void) | null = null

    const run = async () => {
      // Wait for Wails runtime
      if (win?.runtime?.EventsOn) {
        unlisten = win.runtime.EventsOn('init:progress', (p: Progress) => {
          setProgress(p)
        })
      }

      try {
        await api.initialize()
        // small delay so user sees "พร้อมใช้งาน"
        setTimeout(onReady, 400)
      } catch (e: any) {
        setError(e.message ?? String(e))
      } finally {
        unlisten?.()
      }
    }

    run()
  }, [])

  const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 bg-slate-800 flex flex-col items-center justify-center gap-6">
      {/* Logo area */}
      <div className="text-center">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">MedStock</p>
        <p className="text-2xl font-semibold text-white">ระบบสต๊อกเวชภัณฑ์</p>
      </div>

      {/* Progress */}
      <div className="w-72 space-y-2">
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-slate-400 text-center">{progress.message}</p>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      </div>
    </div>
  )
}
