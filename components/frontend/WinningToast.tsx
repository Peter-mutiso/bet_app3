'use client'

import { useEffect, useState, useRef } from 'react'

const FAKE_NAMES = [
  'James K.','Faith W.','Brian O.','Grace A.','Kevin M.',
  'Mercy N.','Samuel O.','Tabitha W.','Dennis K.','Lydia A.',
  'Victor M.','Esther N.','Patrick O.','Caroline W.','Felix K.',
  'Beatrice A.','George N.','Irene C.','Robert N.','Angela M.',
  'Wanjiku','Otieno','Kamau','Adhiambo','Mwangi',
  'Chebet','Auma','Njeri','Odhiambo','Kipchoge',
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildAmounts(min: number, max: number): number[] {
  // Weighted: many steps in the lower 10% of range, fewer toward max
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const step = Math.max(50, Math.round((high - low) / 40))
  const amounts: number[] = []
  // Dense at low end (70% of range)
  const mid = Math.round(low + (high - low) * 0.3)
  for (let v = low; v <= mid; v += step) amounts.push(v)
  // Sparse toward high end
  const bigStep = Math.max(step * 4, Math.round((high - mid) / 5))
  for (let v = mid + bigStep; v <= high; v += bigStep) amounts.push(v)
  if (!amounts.length) amounts.push(low)
  return amounts
}

interface WinEntry {
  id: number
  name: string
  amount: number
  side: 'left' | 'right'
  isReal: boolean
}

export default function WinningToast({ siteName = 'NEKTA FX', insideChart = false,
 }: { siteName?: string,   insideChart?: boolean,
 }) {
  const [toasts, setToasts] = useState<WinEntry[]>([])
  const counterRef = useRef(0)
  const realWinsRef = useRef<{ name: string; amount: number }[]>([])
  const cfgRef = useRef({
    enabled: true,
    minSecs: 6,
    maxSecs: 14,
    realPct: 40,
    minAmt: 100,
    maxAmt: 10000,
  })

  // Fetch settings + real wins on mount
  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(d => {
        cfgRef.current = {
          enabled: d.winning_toast_enabled ?? true,
          minSecs: d.winning_toast_interval_min_secs ?? 6,
          maxSecs: d.winning_toast_interval_max_secs ?? 14,
          realPct: d.winning_toast_real_win_pct ?? 40,
          minAmt: d.winning_toast_min_amount ?? 100,
          maxAmt: d.winning_toast_max_amount ?? 10000,
        }
      })
      .catch(() => {})

    fetch('/api/wins')
      .then(r => r.json())
      .then(d => { realWinsRef.current = d.wins || [] })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function spawn() {
      const cfg = cfgRef.current
      if (!cfg.enabled) return

      const id = ++counterRef.current
      const side: 'left' | 'right' = Math.random() > 0.5 ? 'right' : 'left'
      const useReal = realWinsRef.current.length > 0 && Math.random() * 100 < cfg.realPct
      const real = useReal ? randomFrom(realWinsRef.current) : null
      const amounts = buildAmounts(cfg.minAmt, cfg.maxAmt)

      const entry: WinEntry = {
        id,
        name: real ? real.name : randomFrom(FAKE_NAMES),
        amount: real ? real.amount : randomFrom(amounts),
        side,
        isReal: !!real,
      }

      setToasts(prev => [...prev.slice(-3), entry])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800)
    }

    const first = setTimeout(spawn, 1800)
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      const cfg = cfgRef.current
      const minMs = (cfg.minSecs || 6) * 1000
      const maxMs = (cfg.maxSecs || 14) * 1000
      const delay = minMs + Math.random() * (maxMs - minMs)
      timer = setTimeout(() => { spawn(); schedule() }, delay)
    }
    schedule()

    return () => { clearTimeout(first); clearTimeout(timer) }
  }, [])

  if (toasts.length === 0 || !cfgRef.current.enabled) return null

  return (
    <div className={`pointer-events-none ${insideChart ? 'absolute inset-0 ' : 'fixed inset-0 md:hidden'} z-[55] overflow-hidden`}>
      {toasts.map(t => (
        <Toast key={t.id} entry={t} siteName={siteName} />
      ))}
    </div>
  )
}

function Toast({ entry, siteName }: { entry: WinEntry; siteName: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 30)
    const hide = setTimeout(() => setVisible(false), 3000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])

  const isRight = entry.side === 'right'

  return (
    <div
      className={`absolute bottom-28 p-2 md:bottom-24 transition-all duration-500 ease-out ${
        isRight ? 'left-4' : 'left-4'
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="flex items-center gap-2.5 bg-[#0d1525]/95 backdrop-blur-sm border border-[#22c55e]/30 rounded-2xl px-3.5 py-2.5 shadow-xl shadow-black/40 p-2 max-w-[220px]">
        {/* Coin */}
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30"
          style={{ animation: 'coin-spin 1.2s ease-in-out' }}
        >
          <span className="text-base font-black text-amber-900">$</span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-xs truncate">{entry.name}</span>
            <span className="text-[10px] text-gray-400 shrink-0">won</span>
          </div>
          <div className="text-[#22c55e] font-black text-sm leading-tight">
            +KSh {entry.amount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {entry.isReal ? (
              // Real win: green checkmark badge
              <>
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-[#22c55e] shrink-0"><path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7z"/></svg>
                <span className="text-[9px] text-[#22c55e] font-semibold tracking-wide">Verified withdrawal · {siteName}</span>
              </>
            ) : (
              // Simulated: blue star badge
              <>
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-blue-400 shrink-0"><path d="M6 0l1.4 3.9H11L8 6.3l1.1 3.9L6 8l-3.1 2.2L4 6.3 1 3.9h3.6z"/></svg>
                <span className="text-[9px] text-blue-400 font-semibold tracking-wide">Verified by {siteName}</span>
              </>
            )}
          </div>
        </div>

        {/* Sparkle */}
        <div
          className="text-amber-400 text-base shrink-0"
          style={{ animation: 'sparkle-pop 0.6s ease-out 0.2s both' }}
        >
          ✨
        </div>
      </div>
    </div>
  )
}
