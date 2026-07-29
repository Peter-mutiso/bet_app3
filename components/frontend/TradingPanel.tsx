'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TradingPanelProps {
  balance: number
  pair: any
  onTrade: (amount: number, direction: 'buy' | 'sell') => void
  activeTrade: any | null
  buyLabel?: string
  sellLabel?: string
  settings?: any
  activeCurrency?: string
  livePrice?: number | null
}

const DEFAULT_QUICK_KES = [50, 100, 250, 500, 1000]
const DEFAULT_QUICK_USD = [1, 5, 10, 25, 50, 100]

function parseQuickAmounts(value: unknown, fallback: number[]): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter(n => !Number.isNaN(n) && n > 0)
  }
  if (typeof value === 'string') {
    return value.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n) && n > 0)
  }
  return fallback
}

function formatPrice(value: unknown, decimals = 5, fallback = '0.00000'): string {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(decimals) : fallback
}

export default function TradingPanel({
  balance, pair, onTrade, activeTrade,
  buyLabel = 'BUY', sellLabel = 'SELL',
  settings, activeCurrency = 'KES', livePrice,
}: TradingPanelProps) {
  const [amount, setAmount] = useState<string>('100')
  const numAmount = parseFloat(amount) || 0
  // Stop loss — display-only input for now (not wired into trade logic).
  const [stopLoss, setStopLoss] = useState<string>('')

  // Countdown — ticks every 100ms for smooth display
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (activeTrade?.status === 'processing' && activeTrade.startTime) {
      const duration = settings?.trade_duration_seconds || 10
      const tick = () => {
        const elapsed = (Date.now() - activeTrade.startTime) / 1000
        setSecondsLeft(Math.max(0, Math.ceil(duration - elapsed)))
      }
      tick()
      timerRef.current = setInterval(tick, 250)
    } else {
      setSecondsLeft(null)
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeTrade?.status, activeTrade?.startTime, settings?.trade_duration_seconds])

  const isInPosition = activeTrade?.status === 'processing'

  const currency = activeCurrency === 'USD' ? 'USD' : 'KSH'
  const symbol = currency === 'USD' ? '$' : 'KSh'
  const conversionRate = settings?.conversion_rate || 129
  const payoutMultiplier = settings?.payout_multiplier || 1.8

  const quickAmounts = currency === 'USD'
    ? parseQuickAmounts(pair?.quick_amounts_usd, DEFAULT_QUICK_USD)
    : parseQuickAmounts(pair?.quick_amounts_kes, DEFAULT_QUICK_KES)

  const stakeDisplay = activeTrade?.amount || 0

  // P&L animation: shoots to a fake peak in first 4s, then falls to a small positive for remainder
  const livePnL = (() => {
    if (!isInPosition || !activeTrade?.startTime) return 0
    const duration = settings?.trade_duration_seconds || 10
    const elapsed = (Date.now() - activeTrade.startTime) / 1000
    const peakTime = Math.min(4, duration * 0.4)

    // Peak value: 5-10x stake, seeded per trade so it stays stable across ticks
    const seed = activeTrade.startTime % 1000
    const peakMultiplier = 5 + (seed / 1000) * 5
    const peak = stakeDisplay * peakMultiplier

    // Landing value: small profit (10–25% of stake) — shoots high then settles
    const landing = stakeDisplay * (0.10 + (seed / 1000) * 0.15)

    if (elapsed <= peakTime) {
      // Rise from 0 to peak
      return peak * Math.min(1, elapsed / peakTime)
    } else {
      // Fall from peak to landing
      const fallProgress = Math.min(1, (elapsed - peakTime) / (duration - peakTime))
      return peak - (peak - landing) * fallProgress
    }
  })()

  const timerPercent = (() => {
    if (!isInPosition || secondsLeft === null) return 100
    const duration = settings?.trade_duration_seconds || 10
    return (secondsLeft / duration) * 100
  })()

  const minStakeKes = settings?.min_stake_kes || 50
  const maxStakeKes = settings?.max_stake_kes || 100000
  // Convert limits to display currency
  const minStakeDisplay = activeCurrency === 'USD' ? minStakeKes / conversionRate : minStakeKes
  const maxStakeDisplay = activeCurrency === 'USD' ? maxStakeKes / conversionRate : maxStakeKes

  const hasInsufficientBalance = numAmount > balance
  const belowMin = numAmount < minStakeDisplay && numAmount > 0
  const aboveMax = numAmount > maxStakeDisplay

  // ── In position: show live trade card ───────────────────────────────
  if (isInPosition) {
    return (
      <div className="w-full h-full bg-[#111827] flex flex-col p-4 gap-3">
        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Current Trade</div>

        <div className="bg-[#0d1525] rounded-xl p-4 space-y-3 border border-[#1f2937]">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Current Trade</span>
            <span className="text-white font-bold uppercase">
              {activeTrade.direction?.toUpperCase() || 'BUY'}
              <span className="text-gray-400 font-normal ml-1">GLOBAL/{activeCurrency}</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Entry Price</span>
            <span className="text-white font-mono">{formatPrice(activeTrade.entryPrice, 5, '—')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Invested</span>
            <span className="text-white font-bold">{symbol} {stakeDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Auto Sell</span>
            <span className="text-amber-400 font-bold font-mono">{secondsLeft ?? 0}s</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Live P&L</span>
            <span className="font-bold text-[#22c55e]">
              +{symbol} {livePnL.toFixed(2)}
            </span>
          </div>
          <div className="border-t border-[#1f2937] pt-2 flex justify-between text-sm">
            <span className="text-gray-400">Est. Return</span>
            <span className="font-bold text-[#22c55e]">
              {symbol} {(stakeDisplay + livePnL).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Big processing button with countdown bar */}
        <button
          onClick={() => onTrade(stakeDisplay, activeTrade.direction || 'buy')}
          className="w-full rounded-xl font-black text-lg py-5 flex flex-col items-center justify-center gap-1 cursor-pointer"
          style={activeTrade.direction === 'sell'
            ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }
            : { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'black' }
          }
        >
          <span>PROCESSING TRADE ({secondsLeft ?? 0}S)</span>
          <span className="text-base font-bold">{symbol} {(stakeDisplay + livePnL).toFixed(2)}</span>
          <div className="w-4/5 h-1.5 bg-black/30 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-100"
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </button>

        {livePrice && (
          <div className="text-center text-xs text-gray-500 font-mono">
            Live: {livePrice.toFixed(5)}
          </div>
        )}
      </div>
    )
  }

  // ── Idle: normal trading controls ────────────────────────────────────
  return (
    <div className="w-full h-full bg-[#111827] flex flex-col p-4">
      <div className="text-sm font-bold sm:flex hidden items-center justify-start  text-white mb-4">
        Trading Panel <span className="text-xs mx-1 text-gray-400 font-normal"> ({currency})</span>
      </div>

      <div className="flex gap-2 mb-5">
        <Button
          className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-12 text-lg disabled:opacity-50"
          disabled={belowMin || aboveMax || hasInsufficientBalance}
          onClick={() => onTrade(numAmount, 'buy')}
        >
          {buyLabel}
        </Button>
        <Button
          className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold h-12 text-lg disabled:opacity-50"
          disabled={belowMin || aboveMax || hasInsufficientBalance}
          onClick={() => onTrade(numAmount, 'sell')}
        >
          {sellLabel}
        </Button>
      </div>

      {/* Trade Amount + Stop Loss side by side */}
      <div className="grid grid-cols-2 gap-3 mb-1">
        <div>
          <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Trade Amount</span>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{symbol}</div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`bg-[#1f2937] border-[#374151] text-white pl-12 h-12 text-lg ${belowMin || aboveMax ? '!border-red-500' : ''}`}
            />
          </div>
        </div>
        <div>
          <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Stop Loss</span>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{symbol}</div>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
              className="bg-[#1f2937] border-[#374151] text-white pl-12 h-12 text-lg"
            />
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-4">
        {symbol} {minStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 })} – {symbol} {maxStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>

      {/* Quick amounts: horizontal scroll on mobile, grid on sm+ */}
      <div className="grid sm:grid-cols-4 grid-cols-4 gap-1  mb-5 overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible">
        {quickAmounts.map((q: number) => (
          <Button
            key={q}
            variant="outline"
            className={`!cursor-pointer sm:text-xs !border-[#374151] shrink-0 transition-colors ${numAmount === q ? '!bg-[#22c55e] !text-black !border-[#22c55e]' : 'bg-[#1f2937]/50 text-gray-300 hover:bg-[#374151] hover:text-white'}`}
            onClick={() => setAmount(q.toString())}
          >
            {symbol} {q.toLocaleString()}
          </Button>
        ))}
      </div>

      <div className="bg-[#1f2937] rounded-lg p-4 space-y-2 mt-auto">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Live Price</span>
          <span className="text-[#22c55e] font-mono">
            {livePrice ? formatPrice(livePrice) : formatPrice(pair?.base_price)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Stake</span>
          <span className="text-white font-bold">
            {symbol} {numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        {/* <div className="flex justify-between text-sm">
          <span className="text-gray-400">Payout (if win)</span>
          <span className="text-[#22c55e] font-bold">
            {symbol} {(numAmount * payoutMultiplier).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div> */}
      </div>

      {belowMin && (
        <div className="mt-3 p-2.5 border border-red-900/50 bg-red-500/10 text-red-400 text-xs text-center rounded">
          Minimum stake is {symbol} {minStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
      {aboveMax && (
        <div className="mt-3 p-2.5 border border-red-900/50 bg-red-500/10 text-red-400 text-xs text-center rounded">
          Maximum stake is {symbol} {maxStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      )}
      {hasInsufficientBalance && !belowMin && !aboveMax && (
        <div className="mt-3 p-2.5 border border-red-900/50 bg-red-500/10 text-red-400 text-xs text-center rounded">
          Insufficient balance
        </div>
      )}
    </div>
  )
}
