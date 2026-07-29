'use client'

import { CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  type: 'open' | 'win' | 'loss' | 'tie'
  direction?: 'buy' | 'sell'
  pair?: string
  amount?: string
  price?: string
  pnl?: string
}

export default function TradeToast({ type, direction, pair, amount, price, pnl }: Props) {
  if (type === 'open') {
    const isBuy = direction === 'buy'
    return (
      <div className="flex items-start gap-3 min-w-[260px]">
        <div className={`mt-0.5 rounded-full p-1 ${isBuy ? 'bg-[#22c55e]/20' : 'bg-[#ef4444]/20'}`}>
          {isBuy
            ? <TrendingUp className="w-4 h-4 text-[#22c55e]" />
            : <TrendingDown className="w-4 h-4 text-[#ef4444]" />
          }
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Market order executed</span>
          <span className="text-sm font-bold text-white">{pair || 'GLOBAL/USD OTC'}</span>
          <span className={`text-sm font-semibold ${isBuy ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {isBuy ? 'Buy' : 'Sell'} {amount} at {price}
          </span>
        </div>
      </div>
    )
  }

  if (type === 'win') {
    return (
      <div className="flex items-start gap-3 min-w-[260px]">
        <div className="mt-0.5 rounded-full p-1 bg-[#22c55e]/20">
          <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Trade closed — Profit</span>
          <span className="text-sm font-bold text-white">{pair || 'GLOBAL/USD OTC'}</span>
          <span className="text-sm font-semibold text-[#22c55e]">+{pnl}</span>
        </div>
      </div>
    )
  }

  if (type === 'loss') {
    return (
      <div className="flex items-start gap-3 min-w-[260px]">
        <div className="mt-0.5 rounded-full p-1 bg-[#ef4444]/20">
          <XCircle className="w-4 h-4 text-[#ef4444]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Trade closed — Loss</span>
          <span className="text-sm font-bold text-white">{pair || 'GLOBAL/USD OTC'}</span>
          <span className="text-sm font-semibold text-[#ef4444]">-{pnl}</span>
        </div>
      </div>
    )
  }

  // tie
  return (
    <div className="flex items-start gap-3 min-w-[260px]">
      <div className="mt-0.5 rounded-full p-1 bg-gray-500/20">
        <CheckCircle2 className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Trade closed — Breakeven</span>
        <span className="text-sm font-bold text-white">{pair || 'GLOBAL/USD OTC'}</span>
        <span className="text-sm font-semibold text-gray-400">{pnl} refunded</span>
      </div>
    </div>
  )
}
