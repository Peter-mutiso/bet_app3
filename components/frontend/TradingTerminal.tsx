'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { BarChart2, MessageSquare, Trophy, Medal } from 'lucide-react'
import PairTicker from './PairTicker'
import Header from './Header'
import NewsTicker from './NewsTicker'
import TradingPanel from './TradingPanel'
import LiveChat from './LiveChat'
import CandleChart, { CandleChartHandle } from '../shared/CandleChart'
import { toast } from 'sonner'
import TradeToast from './TradeToast'
import Leaderboard from './Leaderboard'
import Tournaments from './Tournaments'
import { playOrderSound } from '@/lib/trade-sound'
import {
  isCurrencySwitcherEnabled,
  resolveActiveCurrency,
  getDefaultCurrency,
  getCurrencySymbol,
} from "@/lib/currency-settings"
import AuthModals from './AuthModals'
import HowToTradeModal from './HowToTradeModal'
import WinningToast from './WinningToast'

// Tabbed Chat/Leaderboard/Tournaments panel for desktop right column
function DesktopRightTab({ user, conversionRate, activeCurrency, activeTab, onTabChange, onBalanceDeducted, onLoginClick, onTournamentsChange }: {
  user: any; conversionRate: number; activeCurrency: string
  activeTab: 'chat' | 'leaders' | 'tournaments'
  onTabChange: (t: 'chat' | 'leaders' | 'tournaments') => void
  onBalanceDeducted: () => void
  onLoginClick: () => void
  onTournamentsChange?: () => void
}) {
  const tab = activeTab
  const setTab = onTabChange
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex shrink-0 border-b border-[#1f2937]">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'chat' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-white'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button
          onClick={() => setTab('leaders')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'leaders' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-white'}`}
        >
          <Trophy className="w-3.5 h-3.5" /> Top
        </button>
        <button
          onClick={() => setTab('tournaments')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'tournaments' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-white'}`}
        >
          <Medal className="w-3.5 h-3.5" /> Tours
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'chat' && <LiveChat user={user} />}
        {tab === 'leaders' && <Leaderboard conversionRate={conversionRate} currency={activeCurrency} />}
        {tab === 'tournaments' && <Tournaments onBalanceDeducted={onBalanceDeducted} onTournamentsChange={onTournamentsChange} user={user} onLoginClick={onLoginClick} />}
      </div>
    </div>
  )
}


export default function TradingTerminal({ settings, pairs = [], news }: any) {
  const [user, setUser] = useState<any>(null)
  const isDemoMode = !user
  const [demoBalanceUsd, setDemoBalanceUsd] = useState(settings?.demo_starting_balance || 1000)
  const [localCurrency, setLocalCurrency] = useState(getDefaultCurrency(settings))

  // Active pair — default to first pair
  const [selectedPairId, setSelectedPairId] = useState<string>(pairs[0]?.id || '')
  const [switching, setSwitching] = useState(false)
  const pair = pairs.find((p: any) => p.id === selectedPairId) || pairs[0] || null

  const [historicalCandles, setHistoricalCandles] = useState<any[]>([])

  const fetchCandles = useCallback(async (showOverlay = false) => {
  if (!pair?.id) return

  if (showOverlay) setSwitching(true)

  try {
    console.log("========================================")
    console.log("Loading candles for pair:", pair.id)

    const res = await fetch(`/api/chart?pair_id=${pair.id}`)
    const data = await res.json()

    console.log("API Response")
    console.log(data)

    console.log("Candles returned:", data.candles?.length)

    if (data.candles?.length) {
      console.log("First candle:", data.candles[0])
      console.log("Last candle:", data.candles[data.candles.length - 1])
    }

    setHistoricalCandles(data.candles || [])
  } catch (err) {
    console.error("fetchCandles error:", err)
  }

  setSwitching(false)
}, [pair?.id])

  useEffect(() => { fetchCandles(true) }, [fetchCandles])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCandles() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchCandles])

  const switcherEnabled = isCurrencySwitcherEnabled(settings)
  const activeCurrency = resolveActiveCurrency(
  settings,
  user?.currency_preference,
  localCurrency
)

const conversionRate = Number(settings?.conversion_rate) || 129

const symbol = getCurrencySymbol(activeCurrency)
  const payoutMultiplier = pair?.payout_multiplier || settings?.payout_multiplier || 1.8

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [howToTradeOpen, setHowToTradeOpen] = useState(false)

  // Active tournament mini-state for the stats bar pill
  const [activeTournament, setActiveTournament] = useState<{ name: string; participant_count: number; joined: boolean; status: 'active' | 'upcoming' } | null>(null)
  const refreshActiveTournament = useCallback(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => {
        const list: any[] = d.tournaments || []
        const featured = list.find((t: any) => t.status === 'active') ?? list.find((t: any) => t.status === 'upcoming')
        if (featured) {
          setActiveTournament({
            name: featured.name,
            participant_count: featured.participant_count,
            joined: featured.joined,
            status: featured.status,
          })
        } else {
          setActiveTournament(null)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshActiveTournament()
    const id = setInterval(refreshActiveTournament, 5000)
    return () => clearInterval(id)
  }, [user, refreshActiveTournament])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(console.error)
  }, [])

  const refreshUser = useCallback(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
  }, [])

  // Balance refresh via polling (replaced Supabase realtime on MySQL migration)
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  // Chat simulation
  useEffect(() => {
    if (!settings?.chat_simulation_enabled) return
    const minMs = (settings.chat_simulation_freq_min_secs ?? 20) * 1000
    const maxMs = (settings.chat_simulation_freq_max_secs ?? 60) * 1000
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      const delay = minMs + Math.random() * (maxMs - minMs)
      timer = setTimeout(async () => {
        await fetch('/api/chat/simulate', { method: 'POST' }).catch(() => {})
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [settings?.chat_simulation_enabled, settings?.chat_simulation_freq_min_secs, settings?.chat_simulation_freq_max_secs])

  // activeTrade: { id, amount, direction, status:'processing', startTime, entryPrice, outcome?, payout? }
  const [mobileTab, setMobileTab] = useState<'trade' | 'chat' | 'leaders' | 'tournaments'>('trade')
  const [desktopTab, setDesktopTab] = useState<'chat' | 'leaders' | 'tournaments'>('chat')
  const [activeTrade, setActiveTrade] = useState<any>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const livePriceRef = useRef<number | null>(null)
  const [, setPnlTick] = useState(0)

  // Re-render P&L every 100ms while a trade is active so convergence animates smoothly
  useEffect(() => {
    if (!activeTrade) return
    const t = setInterval(() => setPnlTick(n => n + 1), 250)
    return () => clearInterval(t)
  }, [!!activeTrade])
  const chartRef = useRef<CandleChartHandle>(null)
  const mobileChartRef = useRef<CandleChartHandle>(null)

  // Track which chart is visible so only one SSE stream drives livePrice
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // P&L animation: shoots to a fake peak in first 4s, then falls to a small positive for remainder
  const displayPnL = (() => {
    if (!activeTrade || !activeTrade.startTime) return 0
    const stake = activeTrade.amount || 0
    const duration = settings?.trade_duration_seconds || 10
    const elapsed = (Date.now() - activeTrade.startTime) / 1000
    const peakTime = Math.min(4, duration * 0.4)

    const seed = activeTrade.startTime % 1000
    const peakMultiplier = 5 + (seed / 1000) * 5
    const peak = stake * peakMultiplier
    // Landing value: small profit (10–25% of stake) — shoots high then settles
    const landing = stake * (0.10 + (seed / 1000) * 0.15)

    if (elapsed <= peakTime) {
      return peak * Math.min(1, elapsed / peakTime)
    } else {
      const fallProgress = Math.min(1, (elapsed - peakTime) / (duration - peakTime))
      return peak - (peak - landing) * fallProgress
    }
  })()

  const toggleCurrency = () => {
    if (!switcherEnabled) return
    const next = activeCurrency === 'USD' ? 'KES' : 'USD'
    setLocalCurrency(next)
    if (user) setUser({ ...user, currency_preference: next })
  }

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleTick = useCallback(({ price }: { price: number }) => {
    setLivePrice(price)
    livePriceRef.current = price
  }, [])

  // Auto-resolve a trade: credit balance/demo, show result, clear trade
  // payout is in display currency (same units as trade.amount)
  const resolveTrade = useCallback((trade: any, outcome: string, payout: number) => {
    const pairName = pair?.display_name || pair?.symbol || 'GLOBAL/USD OTC'
    // demoBalanceUsd is stored in USD — convert payout back for demo credit
    const payoutUsd = activeCurrency === 'USD' ? payout : payout / conversionRate

    if (outcome === 'tie') {
      playOrderSound('loss')
      const amountDisplay = `${symbol} ${(trade.amount || 0).toFixed(2)}`
      toast.custom(() => <TradeToast type="tie" pair={pairName} pnl={amountDisplay} />)
      if (!trade.isReal) setDemoBalanceUsd((prev: number) => prev + payoutUsd)
    } else if (outcome === 'win') {
      playOrderSound('win')
      const profit = payout - trade.amount
      const profitDisplay = `${symbol} ${Math.abs(profit).toFixed(2)}`
      toast.custom(() => <TradeToast type="win" pair={pairName} pnl={profitDisplay} />)
      if (!trade.isReal) {
        setDemoBalanceUsd((prev: number) => prev + payoutUsd)
      } else {
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
      }
    } else {
      // Loss returns a small positive payout — show as a small win so user never sees red
      playOrderSound('win')
      const profitDisplay = `${symbol} ${payout.toFixed(2)}`
      toast.custom(() => <TradeToast type="win" pair={pairName} pnl={profitDisplay} />)
      if (!trade.isReal) setDemoBalanceUsd((prev: number) => prev + payoutUsd)
      else fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
    }

    setActiveTrade(null)
  }, [activeCurrency, conversionRate, symbol, pair, payoutMultiplier])

  const handleTrade = async (amount: number, direction: 'buy' | 'sell') => {
    // If trade is already active, show a nudge and do nothing
    if (activeTrade?.status === 'processing') {
      toast.info('Wait till the trade completes processing')
      return
    }

    // Stake limit validation (client-side, mirrored from settings)
    const minKes = settings?.min_stake_kes || 50
    const maxKes = settings?.max_stake_kes || 100000
    const amountKes = activeCurrency === 'USD' ? amount * conversionRate : amount
    if (amountKes < minKes) return toast.error(`Minimum stake is KSh ${minKes.toLocaleString()}`)
    if (amountKes > maxKes) return toast.error(`Maximum stake is KSh ${maxKes.toLocaleString()}`)

    if (isDemoMode) {
      // ── Demo trade ────────────────────────────────────────────────
      const entrySnapshot = livePriceRef.current
      if (!entrySnapshot) return toast.error('Waiting for live price — try again in a moment')

      const balanceCurrent = demoBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)
      if (amount > balanceCurrent) return toast.error('Insufficient Demo Balance')

      const stakeUsd = activeCurrency === 'USD' ? amount : amount / conversionRate
      const payoutMult = payoutMultiplier  // capture pair-specific multiplier before async
      setDemoBalanceUsd((prev: number) => prev - stakeUsd)
      const tradeId = Math.random().toString(36).substring(7)
      const tradeObj = { id: tradeId, amount, direction, status: 'processing', startTime: Date.now(), entryPrice: entrySnapshot, pairId: pair?.id, payoutMult, isReal: false }
      setActiveTrade(tradeObj)
      playOrderSound('open')
      toast.custom(() => (
        <TradeToast
          type="open"
          direction={direction}
          pair={pair?.display_name || pair?.symbol || 'GLOBAL/USD OTC'}
          amount={`${symbol} ${amount.toLocaleString()}`}
          price={entrySnapshot.toFixed(5)}
        />
      ))

      try {
        const res = await fetch('/api/trade/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: stakeUsd, pairId: pair?.id, sessionId: tradeId, direction, entryPrice: entrySnapshot }),
        })
        const data = await res.json()
        const duration = (data.duration || 10) * 1000
        const winTarget: boolean = data.winTarget ?? true
        setActiveTrade((prev: any) => ({ ...prev, winTarget }))

        setTimeout(() => {
          const outcome = winTarget ? 'win' : 'loss'
          // Compute payout in display currency (same units as trade.amount)
          const payoutUsd = winTarget
            ? stakeUsd + stakeUsd * (payoutMult - 1) * (0.2 + Math.random() * 0.8)
            : stakeUsd * (0.15 + Math.random() * 0.20)
          const payout = activeCurrency === 'USD' ? payoutUsd : payoutUsd * conversionRate
          resolveTrade(tradeObj, outcome, payout)
        }, duration)
      } catch {
        toast.error('Failed to process trade')
        setActiveTrade(null)
        setDemoBalanceUsd((prev: number) => prev + stakeUsd)
      }

    } else {
      // if (direction !== 'buy') {
      //   toast.info('YOU NEED TO BUY FIRST BEFORE YOU CAN SELL!')
      //   return
      // }
      // ── Real trade ────────────────────────────────────────────────
      if (!user) return openAuth('login')

      const stakeKes = activeCurrency === 'USD' ? amount * conversionRate : amount
      if (stakeKes > (user?.balance_kes || 0)) return toast.error('Insufficient balance')

      const tempId = Math.random().toString(36).substring(7)
      const tradeObj = { id: tempId, amount, direction, status: 'processing', startTime: Date.now(), entryPrice: livePrice, pairId: pair?.id, isReal: true }
      setActiveTrade(tradeObj)
      playOrderSound('open')
      toast.custom(() => (
        <TradeToast
          type="open"
          direction={direction}
          pair={pair?.display_name || pair?.symbol || 'GLOBAL/USD OTC'}
          amount={`${symbol} ${amount.toLocaleString()}`}
          price={livePrice?.toFixed(5) ?? '—'}
        />
      ))

      // Optimistically deduct balance
      setUser((prev: any) => ({ ...prev, balance_kes: (prev.balance_kes || 0) - stakeKes }))

      try {
  const payload = {
    amount: stakeKes,
    direction,
    pairId: pair?.id,
    duration: settings?.trade_duration_seconds || 10,
    entryPrice: livePrice,
  }

  console.log("====== TradingTerminal ======")
  console.log("Payload:", payload)

  const res = await fetch("/api/trade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error || 'Trade failed')
          setActiveTrade(null)
          // Refund optimistic deduction
          setUser((prev: any) => ({ ...prev, balance_kes: (prev.balance_kes || 0) + stakeKes }))
          return
        }

        const duration = (data.duration || 10) * 1000
        const tradeId = data.tradeId
        const winTarget: boolean = data.isWin ?? true
        const serverPayoutMult = data.payoutMultiplier
        setActiveTrade((prev: any) => ({ ...prev, winTarget, ...(serverPayoutMult ? { payoutMult: serverPayoutMult } : {}) }))

        setTimeout(async () => {
  const pollResult = async () => {
    const res = await fetch(`/api/trade/result?id=${tradeId}`).catch(() => null);

    if (!res?.ok) return null;

    return res.json();
  };

  let result = null;

  // Poll for up to 5 seconds
  for (let i = 0; i < 25; i++) {
    result = await pollResult();

    if (result && result.outcome !== "pending") {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (!result || result.outcome === "pending") {
    toast.error("Trade settlement timed out.");
    setActiveTrade(null);
    return;
  }

  const payoutKes = Number(result.payout || 0);

  const payoutDisplay =
    activeCurrency === "USD"
      ? payoutKes / conversionRate
      : payoutKes;

  resolveTrade(
    tradeObj,
    result.outcome,
    payoutDisplay
  );
}, duration + 100);
      } catch {
        toast.error('Network error placing trade')
        setActiveTrade(null)
        setUser((prev: any) => ({ ...prev, balance_kes: (prev.balance_kes || 0) + stakeKes }))
      }
    }
  }

  const realBalanceKes = (user?.balance_kes || 0) - Number(user?.bonus_balance_kes || 0)
  const currentBalance = isDemoMode
    ? demoBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)
    : (activeCurrency === 'USD' ? realBalanceKes / conversionRate : realBalanceKes)

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Header
        user={user}
        settings={settings}
        isDemoMode={isDemoMode}
        activeCurrency={activeCurrency}
        toggleCurrency={switcherEnabled ? toggleCurrency : undefined}
        onLoginClick={() => openAuth('login')}
        onRegisterClick={() => openAuth('register')}
        onHowToTradeClick={() => setHowToTradeOpen(true)}
        onTopTradersClick={() => setDesktopTab('leaders')}
        onTournamentsClick={() => setDesktopTab('tournaments')}
        onLogout={async () => {
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
          setUser(null)
        }}
      />
      {/* <NewsTicker news={news} /> */}

      {/* ── MOBILE layout (hidden on md+) ── */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-y-auto">
        {/* Tab content */}
        <div className="flex-1 overflow-y-auto relative">

          {/* Trade tab: stats + chart + trading panel — scrollable */}
          <div
  className={`absolute inset-0 ${
    mobileTab === "trade"
      ? "flex flex-col"
      : "hidden"
  }`}
>
            {/* Pair ticker — mobile */}
            <PairTicker pairs={pairs} selectedPairId={pair?.id} onSelect={setSelectedPairId} settings={settings} />
            {/* Stats bar */}
            <div className="h-10 border-b border-[#1f2937] flex items-center px-3 justify-between shrink-0 bg-[#0a0f1c] sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <div className="text-[8px] text-gray-500 uppercase tracking-wider">Balance</div>
                  <div className="text-xs font-bold text-[#22c55e] whitespace-nowrap leading-none">
                    {symbol} {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  {!isDemoMode && Number(user?.bonus_balance_kes) > 0 && (
                    <div className="text-[9px] font-semibold text-amber-400 whitespace-nowrap leading-none mt-0.5">
                      {symbol} {(activeCurrency === 'USD' ? Number(user.bonus_balance_kes) / conversionRate : Number(user.bonus_balance_kes)).toLocaleString(undefined, { minimumFractionDigits: 2 })} Bonus
                    </div>
                  )}
                </div>
                {activeTournament && (
                  <button
                    onClick={() => setMobileTab('tournaments')}
                    className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-colors ${
                      activeTournament.joined
                        ? 'bg-amber-400/15 border-amber-400/50 text-amber-400'
                        : 'bg-[#1f2937] border-[#374151] text-gray-300 hover:border-[#22c55e]/50 hover:text-[#22c55e]'
                    }`}
                  >
                    <Medal className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[80px]">
                      {activeTournament.joined ? 'Joined' : activeTournament.status === 'upcoming' ? 'Soon' : activeTournament.name}
                    </span>
                    <span className={`font-black ${activeTournament.joined ? 'text-amber-400' : 'text-[#22c55e]'}`}>
                      {activeTournament.participant_count}
                    </span>
                  </button>
                )}
                {livePrice && (
                  <div className="shrink-0">
                    <div className="text-[8px] text-gray-500 uppercase tracking-wider">Price</div>
                    <div className="text-xs font-bold text-white font-mono">{livePrice.toFixed(5)}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[#22c55e] font-bold text-[10px] tracking-widest">LIVE</span>
                </div>
                <div className="bg-[#1f2937] px-1.5 py-0.5 rounded border border-[#374151] text-[10px] flex items-center gap-1">
                  <span className="text-white font-bold">{activeCurrency}</span>
                </div>
              </div>
            </div>
            {/* Chart */}
<div
  className="
    w-full
    bg-[#0a0f1c]
    relative
    overflow-hidden
    h-[42vh]
    min-h-[320px]
    max-h-[650px]
    isolate
  "
>
              {switching ? (
                <div className="absolute inset-0 bg-[#0a0f1c] flex flex-col items-center justify-center gap-3">
                  <div className="flex items-end gap-[3px] h-10">
                    {[0.4,0.7,0.5,1,0.6,0.85,0.45,0.9,0.55,0.75].map((h, i) => (
                      <div key={i} className="w-2 rounded-sm animate-pulse" style={{ height: `${h * 100}%`, backgroundColor: i % 3 === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)', animationDelay: `${i * 80}ms` }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Loading chart…</span>
                  </div>
                </div>
              ) : (
    <CandleChart
      key={pair?.id}
      ref={chartRef}
      historicalCandles={historicalCandles}
      pairId={pair?.id}
      candleDuration={settings?.candle_duration_seconds || 60}
      onTick={isMobile ? undefined : handleTick}
      streamUrl="/api/chart/stream"
      entryPrice={null}
      visibleCandles={18}
                />
              )}
            </div>
            {/* Trading panel */}
<div className="border-t border-[#1f2937] flex-shrink-0">
              <TradingPanel
                balance={currentBalance}
                pair={pair}
                onTrade={handleTrade}
                activeTrade={activeTrade}
                buyLabel={settings?.buy_button_label}
                sellLabel={settings?.sell_button_label}
                settings={settings}
                activeCurrency={activeCurrency}
                livePrice={livePrice}
              />
            </div>
          </div>

          {/* Chat tab */}
          <div className={`absolute inset-0 ${mobileTab === 'chat' ? 'block' : 'hidden'}`}>
            <LiveChat user={user} />
          </div>

          {/* Leaderboard tab */}
          <div className={`absolute inset-0 ${mobileTab === 'leaders' ? 'block' : 'hidden'}`}>
            <Leaderboard conversionRate={conversionRate} currency={activeCurrency} />
          </div>

          {/* Tournaments tab */}
          <div className={`absolute inset-0 ${mobileTab === 'tournaments' ? 'block' : 'hidden'}`}>
            <Tournaments onBalanceDeducted={refreshUser} onTournamentsChange={refreshActiveTournament} user={user} onLoginClick={() => openAuth('login')} />
          </div>
        </div>

        {/* Bottom tab bar */}
        <div className="h-12 shrink-0 flex border-t border-[#1f2937] bg-[#111827]">
          <button
            onClick={() => setMobileTab('trade')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === 'trade' ? 'text-[#22c55e] border-t-2 border-[#22c55e]' : 'text-gray-500'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Trade
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === 'chat' ? 'text-[#22c55e] border-t-2 border-[#22c55e]' : 'text-gray-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMobileTab('leaders')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === 'leaders' ? 'text-[#22c55e] border-t-2 border-[#22c55e]' : 'text-gray-500'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Top
          </button>
          <button
            onClick={() => setMobileTab('tournaments')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === 'tournaments' ? 'text-[#22c55e] border-t-2 border-[#22c55e]' : 'text-gray-500'
            }`}
          >
            <Medal className="w-4 h-4" />
            Tours
          </button>
        </div>
      </div>

      {/* ── DESKTOP layout (hidden on mobile) ── */}
      <div className="hidden md:flex flex-1 flex-row min-h-0 overflow-hidden">
        {/* Left: chart column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-[#0a0f1c]">
          {/* Pair ticker — desktop */}
          <PairTicker pairs={pairs} selectedPairId={pair?.id} onSelect={setSelectedPairId} settings={settings} />
          {/* Stats bar */}
          <div className="h-16 border-b border-[#1f2937] flex items-center px-6 justify-between shrink-0">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Balance</div>
                <div className="text-lg font-bold text-white whitespace-nowrap">
                  {symbol} {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              {activeTournament && (
                <button
                  onClick={() => setDesktopTab('tournaments')}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border font-bold text-sm transition-all hover:scale-[1.03] active:scale-[0.97] ${
                    activeTournament.joined
                      ? 'bg-amber-400/10 border-amber-400/40 text-amber-400 hover:bg-amber-400/15'
                      : 'bg-[#0a0f1c] border-[#374151] text-gray-200 hover:border-[#22c55e]/50 hover:text-[#22c55e]'
                  }`}
                >
                  <Medal className={`w-4 h-4 shrink-0 ${activeTournament.joined ? 'text-amber-400' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="text-[9px] uppercase tracking-widest text-gray-500 leading-none mb-0.5">
                      {activeTournament.joined ? '✓ Joined' : activeTournament.status === 'upcoming' ? 'Starting Soon' : 'Tournament'}
                    </div>
                    <div className="truncate max-w-[120px] leading-none">
                      {activeTournament.status === 'upcoming' && !activeTournament.joined ? activeTournament.name : activeTournament.name}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${activeTournament.joined ? 'bg-amber-400/20 text-amber-400' : 'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                    <span>{activeTournament.participant_count}</span>
                    <span className="text-[9px] font-normal opacity-70">in</span>
                  </div>
                </button>
              )}
              {livePrice && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Price</div>
                  <div className="text-lg font-bold text-white font-mono">{livePrice.toFixed(5)}</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[#22c55e] font-bold text-sm tracking-widest">LIVE</span>
              </div>
              <div className="bg-[#1f2937] px-3 py-1 rounded border border-[#374151] text-sm flex items-center gap-2">
                <span className="text-gray-400">Global</span>
                <span className="text-white font-bold">{activeCurrency}</span>
              </div>
            </div>
          </div>
          {/* Chart */}
<div
  className="
w-full
bg-[#0a0f1c]
relative
overflow-hidden
h-[42vh]
min-h-[320px]
max-h-[650px]
"
>
            {switching ? (
              <div className="absolute inset-0 bg-[#0a0f1c] flex flex-col items-center justify-center gap-4">
                <div className="flex items-end gap-[4px] h-16">
                  {[0.4,0.65,0.5,1,0.6,0.85,0.45,0.9,0.55,0.75,0.35,0.8,0.6,0.95,0.5].map((h, i) => (
                    <div key={i} className="w-2.5 rounded-sm animate-pulse" style={{
                      height: `${h * 100}%`,
                      backgroundColor: i % 3 === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                      animationDelay: `${i * 60}ms`
                    }} />
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 uppercase tracking-widest">Loading chart…</span>
                </div>
              </div>
            ) : (
              <CandleChart
                key={pair?.id}
                ref={chartRef}
                historicalCandles={historicalCandles}
                pairId={pair?.id}
                candleDuration={settings?.candle_duration_seconds || 60}
                onTick={isMobile ? undefined : handleTick}
                streamUrl="/api/chart/stream"
                entryPrice={null}
                visibleCandles={18}
              />
            )}
          </div>
        </div>

        {/* Right: trading panel + chat */}
<div className="flex flex-col lg:flex-row w-full lg:w-[50%] xl:w-[22%] border-l border-[#1f2937] min-h-0 relative z-20">
  <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[#1f2937] overflow-y-auto">
    <TradingPanel
      balance={currentBalance}
      pair={pair}
      onTrade={handleTrade}
      activeTrade={activeTrade}
      buyLabel={settings?.buy_button_label}
      sellLabel={settings?.sell_button_label}
      settings={{ ...settings, payout_multiplier: payoutMultiplier }}
      activeCurrency={activeCurrency}
      livePrice={livePrice}
    />
  </div>
  <div className="lg:w-1/2 overflow-hidden flex flex-col">
    <DesktopRightTab 
      user={user} 
      conversionRate={conversionRate} 
      activeCurrency={activeCurrency} 
      activeTab={desktopTab} 
      onTabChange={setDesktopTab} 
      onBalanceDeducted={refreshUser} 
      onLoginClick={() => openAuth('login')} 
      onTournamentsChange={refreshActiveTournament} 
    />
  </div>
</div>
              
      </div>

      <AuthModals
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        settings={settings}
        onSuccess={(u) => {
          setUser(u)
          setAuthModalOpen(false)
        }}
      />
      <HowToTradeModal
        isOpen={howToTradeOpen}
        onClose={() => setHowToTradeOpen(false)}
        steps={Array.isArray(settings?.how_to_trade_steps) ? settings.how_to_trade_steps : []}
        settings={settings}
      />

      <WinningToast siteName={settings?.site_name || 'NEKTA FX'} />

      {/* WhatsApp community bubble — only shown when URL is configured for this site */}
      {settings?.whatsapp_community_url && <a
        href={settings.whatsapp_community_url}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 md:bottom-16 right-4 z-50 flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-xs rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 pl-3.5 pr-4 py-2.5"
        style={{ animation: 'whatsapp-bounce 3s ease-in-out infinite' }}
      >
        {/* WhatsApp icon SVG */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="hidden sm:inline whitespace-nowrap">Join Community</span>
      </a>}
    </div>
  )
}
