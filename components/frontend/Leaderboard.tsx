'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month'

interface Trader {
  id: string
  name: string
  avatar_seed: string
  country_code: string
  profit: number
  trades: number
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'this_week',  label: 'This Week' },
  // { value: 'last_week',  label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
]

const FLAG_BASE = 'https://flagcdn.com/16x12'

function Avatar({ seed, name }: { seed: string; name: string }) {
  const initials = seed || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>
  if (rank === 2) return <span className="text-base">🥈</span>
  if (rank === 3) return <span className="text-base">🥉</span>
  return <span className="text-xs font-bold text-gray-500 w-5 text-center">#{rank}</span>
}

export default function Leaderboard({ conversionRate = 129, currency = 'KES' }: { conversionRate?: number; currency?: string }) {
  const [period, setPeriod] = useState<Period>('today')
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?period=${period}`)
      .then(r => r.json())
      .then(d => { setTraders(d.traders || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  const symbol = currency === 'USD' ? '$' : 'KSh'
  const rate = currency === 'USD' ? 1 : conversionRate

  return (
    <div className="flex flex-col h-full bg-[#080d18]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-white uppercase tracking-widest">Top Traders</span>
      </div>

      {/* Period filter */}
      <div className="flex gap-1 px-3 pb-3 shrink-0 overflow-x-auto scrollbar-none">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap uppercase tracking-wide transition-colors shrink-0 ${
              period === p.value
                ? 'bg-[#22c55e] text-black'
                : 'bg-[#1f2937] text-gray-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 scrollbar-none">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1525] animate-pulse">
            <div className="w-5 h-4 bg-[#1f2937] rounded" />
            <div className="w-8 h-8 bg-[#1f2937] rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-[#1f2937] rounded w-24" />
              <div className="h-2.5 bg-[#1f2937] rounded w-16" />
            </div>
            <div className="h-3 bg-[#1f2937] rounded w-14" />
          </div>
        ))}

        {!loading && traders.length === 0 && (
          <div className="text-center text-gray-500 text-xs py-8">No traders this period</div>
        )}

        {!loading && traders.map((t, i) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors ${
              i < 3 ? 'bg-[#0d1525] border border-[#1f2937]' : 'bg-[#0a0f1c]'
            }`}
          >
            <div className="w-5 flex items-center justify-center shrink-0">
              <RankBadge rank={i + 1} />
            </div>
            <Avatar seed={t.avatar_seed} name={t.name} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{t.name}</span>
                <img
                  src={`${FLAG_BASE}/${t.country_code.toLowerCase()}.png`}
                  alt={t.country_code}
                  className="w-4 h-3 object-cover rounded-sm shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="text-[10px] text-gray-500">{t.trades} trade{t.trades !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-xs font-bold text-[#22c55e] shrink-0">
              +{symbol} {(t.profit * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
