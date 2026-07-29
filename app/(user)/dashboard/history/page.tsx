'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { maskPhone, fmtKE } from '@/lib/utils'

export default function HistoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'trades' | 'deposits' | 'withdrawals'>('trades')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/history?type=${tab}`)
      .then(r => r.json())
      .then(d => setItems(d.trades || d.deposits || d.withdrawals || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [tab])

  const fmt = (date: string) => fmtKE(date)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-gray-400 text-sm mt-1">Your trades, deposits, and withdrawals</p>
      </div>

      <div className="flex gap-1 bg-[#0a0f1c] p-1 rounded-lg border border-[#1f2937] w-fit">
        {(['trades', 'deposits', 'withdrawals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-[#22c55e] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Trades */}
      {tab === 'trades' && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
          <div className="grid grid-cols-6 px-5 py-3 border-b border-[#1f2937] text-xs text-gray-500 uppercase tracking-wider font-bold">
            <span>Date</span>
            <span>Pair</span>
            <span>Dir</span>
            <span>Stake</span>
            <span>Payout</span>
            <span>Outcome</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Clock className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">No trades yet</span>
            </div>
          ) : (
            items.map((t, i) => (
              <div key={i} className="grid grid-cols-6 px-5 py-4 border-b border-[#1f2937] last:border-0 text-sm items-center hover:bg-[#1f2937]/40 transition-colors">
                <span className="text-gray-400 text-xs">{fmt(t.created_at)}</span>
                <span className="text-white font-medium">{(t.trading_pairs as any)?.symbol || '—'}</span>
                <span className={`font-bold uppercase text-xs ${t.direction === 'buy' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {t.direction}
                </span>
                <span className="text-white">KSh {Number(t.amount_kes || t.amount_kes_trade || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className={`font-bold ${Number(t.payout_kes) > 0 ? 'text-[#22c55e]' : 'text-gray-500'}`}>
                  {Number(t.payout_kes) > 0 ? `KSh ${Number(t.payout_kes).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                </span>
                <span className={`inline-flex items-center gap-1 font-semibold capitalize text-xs ${
                  t.outcome === 'win' ? 'text-[#22c55e]' :
                  t.outcome === 'loss' ? 'text-[#ef4444]' :
                  t.outcome === 'pending' ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {t.outcome === 'win' ? <TrendingUp className="w-3 h-3" /> :
                   t.outcome === 'loss' ? <TrendingDown className="w-3 h-3" /> : null}
                  {t.outcome}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Deposits */}
      {tab === 'deposits' && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 border-b border-[#1f2937] text-xs text-gray-500 uppercase tracking-wider font-bold">
            <span>Date</span>
            <span>Amount (KSh)</span>
            <span>Status</span>
            <span>Bonus</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <ArrowDownCircle className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">No deposits yet</span>
            </div>
          ) : (
            items.map((d, i) => (
              <div key={i} className="grid grid-cols-4 px-5 py-4 border-b border-[#1f2937] last:border-0 text-sm items-center hover:bg-[#1f2937]/40 transition-colors">
                <span className="text-gray-400 text-xs">{fmt(d.created_at)}</span>
                <span className="text-white font-bold">KSh {Number(d.amount_kes || 0).toLocaleString()}</span>
                <span className={`font-semibold capitalize text-xs ${
                  d.status === 'completed' ? 'text-[#22c55e]' :
                  d.status === 'pending' ? 'text-yellow-400' : 'text-[#ef4444]'
                }`}>{d.status}</span>
                <span className="text-gray-400 text-xs">
                  {d.bonus_applied && Number(d.bonus_amount_kes) > 0 ? `+KSh ${Number(d.bonus_amount_kes).toLocaleString()}` : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Withdrawals */}
      {tab === 'withdrawals' && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 border-b border-[#1f2937] text-xs text-gray-500 uppercase tracking-wider font-bold">
            <span>Date</span>
            <span>Amount (KSh)</span>
            <span>Phone</span>
            <span>Status</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <ArrowUpCircle className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">No withdrawals yet</span>
            </div>
          ) : (
            items.map((w, i) => (
              <div key={i} className="grid grid-cols-4 px-5 py-4 border-b border-[#1f2937] last:border-0 text-sm items-center hover:bg-[#1f2937]/40 transition-colors">
                <span className="text-gray-400 text-xs">{fmt(w.created_at)}</span>
                <span className="text-white font-bold">KSh {Number(w.amount_kes || 0).toLocaleString()}</span>
                <span className="text-gray-400 text-xs font-mono">{maskPhone(w.phone)}</span>
                <span className={`font-semibold capitalize text-xs ${
                  w.status === 'completed' ? 'text-[#22c55e]' :
                  w.status === 'pending' ? 'text-yellow-400' :
                  w.status === 'rejected' ? 'text-[#ef4444]' : 'text-gray-400'
                }`}>
                  {w.status}
                  {w.rejection_reason && <span className="ml-1 text-gray-500">({w.rejection_reason})</span>}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
