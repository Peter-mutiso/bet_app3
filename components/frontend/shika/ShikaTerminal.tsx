'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import AuthModals from '@/components/frontend/AuthModals'
import WinningToast from '@/components/frontend/WinningToast'
import { ShikaEngine, DEFAULT_CONFIG, type ShikaConfig } from './shika-engine'
import './shika.css'

const ShikaChart = dynamic(() => import('./ShikaChart'), { ssr: false })

// ── Trade tuning (mirrors the original CFG; not house-edge related) ──
const TRADE = {
  MIN_STAKE: 10,
  MAX_STAKE: 50000,
  MIN_DEPOSIT: 50,
  MAX_MULT: 5.0,        // cap on the displayed payout multiplier
  PRESTART_WAIT: 5,     // seconds the user can cancel before the trade starts
  AUTOSELL_MULT: 3.0,   // multiplier at which autosell fires
}

interface ShikaUser {
  id: number
  username: string
  phone: string
  balance_kes: number
}

interface Props {
  siteName: string
  logoUrl: string | null
  /** trading_pairs row id used for /api/trade; null disables real trading */
  pairId: number | null
  /** seconds a trade runs before the backend resolves it */
  tradeDuration: number
  initialUser: ShikaUser | null
}

type TradePhase = 'idle' | 'prestart' | 'active' | 'resolving'
type ToastKind = 'success' | 'info' | 'warn' | 'error'

interface Toast { id: number; title: string; sub?: string; kind: ToastKind }
interface ChatMsg { id: number; html: string; kind: 'user' | 'win' | 'bonus' }
interface ActiveTrade { type: 'buy' | 'sell'; entryRate: number; stake: number; tradeId: string; startMs?: number; balanceBefore?: number }
interface ResultData {
  won: boolean; stake: number; payout: number; lostAmount?: number
  entry: number; exit: number; type: string; reason: string
}

const NAMES = ['Brian6733','Joseph9355','Masaicaleb','Realtoxic','Phisher','Eun','Alic55','Y4SKA.09','Levi40','Dalasguy','Timo44','brownn','Scandie','Jojo25paul','MaryWanjiku','SamOtieno','Gracey_ke','DavidKip','AngelMwende','FaithNjeri','KevinMburu','SharonAmani','RyanOdera','CynthiaKam','PeterGitau','LucyAuma','MikeKariuki','DianaWairimu','JamesOchieng','RoseNyambura']
const AMTS = [100,124,145,150,159,195,200,250,300,345,395,450,500,650,700,800,1000,1200,1500,2000]
const UMSGS = ['Just made 500 KES 🔥','Green wave coming!','SELL SELL SELL','BUY now!','Best platform','Trade smart guys','Follow the wave 📈','KES to the moon 🚀']

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

export default function ShikaTerminal({ siteName, logoUrl, pairId, tradeDuration, initialUser }: Props) {
  const resolveLockRef = useRef(false)

  // ── Auth / balance ─────────────────────────────────────────────
  const [user, setUser] = useState<ShikaUser | null>(initialUser)
  const [balance, setBalance] = useState(initialUser?.balance_kes ?? 0)
  const loggedIn = !!user

  // ── Chart engine state ─────────────────────────────────────────
  const cfgRef = useRef<ShikaConfig>({ ...DEFAULT_CONFIG })
  const engineRef = useRef<ShikaEngine>(new ShikaEngine())
  const [prices, setPrices] = useState<number[]>([])
  const [rate, setRate] = useState(0.015)
  const [prevRate, setPrevRate] = useState(0.015)
  const [high24, setHigh24] = useState(0.098)
  const [low24, setLow24] = useState(-0.12)

  // ── UI state ───────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [tradeDur, setTradeDur] = useState(tradeDuration || 60)
  const [stake, setStake] = useState('100')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // ── Trade lifecycle ────────────────────────────────────────────
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null)
  const [phase, setPhase] = useState<TradePhase>('idle')
  const [prestartLeft, setPrestartLeft] = useState(0)
  const [timerLeft, setTimerLeft] = useState(tradeDuration || 60)
  const [result, setResult] = useState<ResultData | null>(null)
  const [celebrate, setCelebrate] = useState(0)
  const [pnlTick, setPnlTick] = useState(0)

  // ── Modals ─────────────────────────────────────────────────────
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  // ── Toasts / chat / live stats ─────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([])
  const [heroToast, setHeroToast] = useState<{ title: string; sub?: string } | null>(null)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [onlineCount, setOnlineCount] = useState(1247)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Mirror live values into refs so the tick loop reads fresh state.
  const liveRef = useRef({ rate, prevRate, activeTrade, phase, balance })
  liveRef.current = { rate, prevRate, activeTrade, phase, balance }

  const idSeq = useRef(0)
  const nextId = () => ++idSeq.current
  const placingRef = useRef(false)
  const tradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tradeClockRef = useRef<{
    start: number
    duration: number
    end: number
  } | null>(null)


  // ════ TOASTS ════
  const showToast = useCallback((title: string, opts: { sub?: string; kind?: ToastKind; ms?: number } = {}) => {
    const id = nextId()
    setToasts(t => [...t, { id, title, sub: opts.sub, kind: opts.kind || 'success' }].slice(-4))
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.ms || 3500)
  }, [])

  const showHeroToast = useCallback((title: string, sub?: string, ms = 3200) => {
    setHeroToast({ title, sub })
    setTimeout(() => setHeroToast(null), ms)
  }, [])

  // ════ CHAT ════
  const addMsg = useCallback((html: string, kind: ChatMsg['kind'] = 'user') => {
    setChat(c => [...c, { id: nextId(), html, kind }].slice(-80))
  }, [])

  // ════ LOAD CONFIG FROM BACKEND (best-effort) ════
  useEffect(() => {
    // The original chart pulled graph tuning from /api/settings.php. trading-nova
    // has no equivalent yet, so we keep the defaults — wired here for future use.
    engineRef.current.applyConfig(cfgRef.current)
  }, [])

  // ════ PRICE TICK LOOP ════
  useEffect(() => {
    const engine = engineRef.current
    // Seed 40 points before the first paint, like the original.
    const seed: number[] = []
    for (let i = 0; i < 40; i++) seed.push(engine.next())
    setPrices(seed)
    setRate(engine.rate)
    setPrevRate(engine.prevRate)

    const tick = () => {
      const p = engine.next()
      setPrices(prev => {
        const next = [...prev, p]
        if (next.length > cfgRef.current.MAX_PTS) next.shift()
        return next
      })
      setRate(engine.rate)
      setPrevRate(engine.prevRate)
      setHigh24(engine.high24)
      setLow24(engine.low24)
    }
    const interval = setInterval(tick, cfgRef.current.TICK)
    return () => clearInterval(interval)
  }, [])

  // ════ SIMULATED CHAT + ONLINE COUNT (client-side, as in the original) ════
  useEffect(() => {
    NAMES.slice(0, 12).forEach((n, i) => {
      setTimeout(() => addMsg(`System: CONGRATULATIONS @${n} on withdrawal of ${rand(AMTS)}.00 🎉🎉`, 'win'), i * 90)
    })
    setTimeout(() => addMsg('Jojo25paul: BONUS of 10.00 has been issued 🎁', 'bonus'), 1300)

    const winInt = setInterval(
      () => addMsg(`System: CONGRATULATIONS @${rand(NAMES)} on withdrawal of ${rand(AMTS)}.00 🎉🎉`, 'win'),
      3000 + Math.random() * 2000,
    )
    const bonusInt = setInterval(() => {
      if (Math.random() > 0.6) addMsg(`${rand(NAMES)}: BONUS of 10.00 has been issued 🎁`, 'bonus')
    }, 8000)
    const userInt = setInterval(() => {
      if (Math.random() > 0.5) addMsg(`<span class="name">${rand(NAMES)}:</span> ${rand(UMSGS)}`, 'user')
    }, 5000 + Math.random() * 4000)
    const onlineInt = setInterval(() => setOnlineCount(1200 + Math.floor(Math.random() * 120)), 6000)

    return () => { clearInterval(winInt); clearInterval(bonusInt); clearInterval(userInt); clearInterval(onlineInt) }
  }, [addMsg])

  // Keep chat scrolled to the latest message.
  useEffect(() => {
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat])

  // ════ BACKGROUND BALANCE POLL ════
  useEffect(() => {
    if (!loggedIn) return
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || liveRef.current.activeTrade) return
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.user) {
          const b = Number(data.user.balance_kes)
          if (b !== liveRef.current.balance) {
            const delta = b - liveRef.current.balance
            setBalance(b)
            if (delta > 0 && !liveRef.current.activeTrade) {
              showToast('Wallet updated', { sub: '+ KES ' + fmt(delta), kind: 'info' })
            }
          }
        }
      } catch { /* network hiccup — retry next tick */ }
    }
    const id = setInterval(refresh, 15000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', refresh) }
  }, [loggedIn, showToast])

  // ════ AUTO-RESOLVE WATCH — runs each price tick during an active trade ════
  // useEffect(() => {
  //   if (phase !== 'active' || !activeTrade) return
  //   // Rate crashed THROUGH zero → instant total loss.
  //   if (rate <= 0 && prevRate > 0) { resolveTrade('crash'); return }
  //   // Autosell target reached → cash out automatically.
  //   const rateDiff = rate - activeTrade.entryRate
  //   const rawPayout = rateDiff > 0 ? activeTrade.stake * (1 + rateDiff) : 0
  //   if (rawPayout >= activeTrade.stake * TRADE.AUTOSELL_MULT && TRADE.AUTOSELL_MULT > 1) {
  //     resolveTrade('autosell')
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [rate])

  useEffect(() => {
    if (phase !== 'active' || !tradeClockRef.current) return
    let raf: number
    const tick = () => {
      const { end } = tradeClockRef.current!
      const now = Date.now()

      const left = Math.max(0, Math.ceil((end - now) / 1000))
      setTimerLeft(left)

      if (left <= 0) {
        resolveTrade('expired')
        return
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // ════ PRESTART COUNTDOWN ════
  useEffect(() => {
    if (phase !== 'prestart') return
    if (prestartLeft <= 0) {
      setPhase('active')
      setTimerLeft(tradeDur)
      setActiveTrade(prev => prev ? { ...prev, startMs: Date.now() } : prev)
      return
    }
    const id = setTimeout(() => setPrestartLeft(p => p - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, prestartLeft, tradeDur])

  // ════ ACTIVE TRADE TIMER ════
  // Use a single timeout fired once per trade (not per tick) to avoid
  // stale-closure glitches when the user clicks rapidly.
  useEffect(() => {
    if (phase !== 'active' || !tradeClockRef.current) return

    const interval = setInterval(() => {
      const { end } = tradeClockRef.current!
      const now = Date.now()

      const left = Math.max(0, Math.ceil((end - now) / 1000))
      setTimerLeft(left)

      if (left <= 0) {

        clearInterval(interval)
                setPhase('resolving')

        resolveTrade('expired')
      }
    }, 200)

    return () => clearInterval(interval)
  }, [phase])



  // ════ P&L ANIMATION TICK (100ms) ════
  // const pnlStartRef = useRef<number>(0)
  useEffect(() => {
    if (phase !== 'active') return
    // pnlStartRef.current = Date.now()
    const id = setInterval(() => setPnlTick(t => t + 1), 100)
    return () => clearInterval(id)
  }, [phase])

  // ════ TRADING ════
  const placeTrade = useCallback(async (type: 'buy' | 'sell') => {
    if (activeTrade || placingRef.current) return
    placingRef.current = true
    const stk = parseFloat(stake) || 100
    if (stk < TRADE.MIN_STAKE) { placingRef.current = false; showToast(`Minimum stake is KES ${TRADE.MIN_STAKE}`, { kind: 'warn' }); return }
    if (stk > TRADE.MAX_STAKE) { placingRef.current = false; showToast(`Maximum stake is KES ${TRADE.MAX_STAKE}`, { kind: 'warn' }); return }
    if (stk > balance) { placingRef.current = false; showToast('Insufficient balance. Please deposit.', { kind: 'error' }); return }
    if (!loggedIn) { placingRef.current = false; setAuthMode('login'); setAuthOpen(true); return }
    if (!pairId) { placingRef.current = false; showToast('Trading is not configured for this site.', { kind: 'error' }); return }

    try {
      console.log("========== PLACE TRADE ==========");
console.log({
  amount: stk,
  direction: type.toUpperCase(),
  pairId,
  duration: tradeDur,
  entryPrice: rate,
});
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
    amount: stk,
    direction: type.toUpperCase(),
    pairId,
    duration: tradeDur,
    entryPrice: rate,
}),
      })
      const data = await res.json()
      if (!res.ok || data.error) { placingRef.current = false; showToast(data.error || 'Trade failed', { kind: 'error' }); return }

      // Backend debited the stake; mirror it locally.
      const balanceBefore = liveRef.current.balance
      setBalance(b => b - stk)
      const entryRate = liveRef.current.rate
      const dur = Number(data.duration) || tradeDur
      setActiveTrade({ type, entryRate, stake: stk, tradeId: data.tradeId, balanceBefore, startMs: Date.now() })
      const now = Date.now()

      tradeClockRef.current = {
        start: now,
        duration: dur,
        end: now + dur * 1000
      }

      setTradeDur(dur)
      // setTimerLeft(dur)
      setPhase('active')


      showHeroToast(
        `Investment of KES ${fmt(stk)} received`,
        `Trade running · ${dur}s`,
      )
    } catch {
      placingRef.current = false
      showToast('Network error. Try again.', { kind: 'error' })
    } finally {
      placingRef.current = false
    }
  }, [activeTrade, stake, balance, loggedIn, pairId, tradeDur, showToast, showHeroToast])

  const cancelTrade = useCallback(() => {
    if (!activeTrade || phase !== 'prestart') return
    // The backend trade is already running and will resolve on its own; we
    // cannot recall it. Cancelling here only stops the prestart UI and the
    // stake stays committed — so instead we let it run. Inform the user.
    showToast('Trade already submitted — it will run to completion.', { kind: 'info' })
  }, [activeTrade, phase, showToast])

  const resolveTrade = useCallback(async (reason: string) => {
  if (resolveLockRef.current) return;
  if (!activeTrade) return;

  resolveLockRef.current = true;
  setPhase("resolving");

  try {
    const response = await fetch("/api/trade/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tradeId: activeTrade.tradeId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || "Trade resolution failed", {
        kind: "error",
      });
      return;
    }

    setBalance(data.balance);

    setResult({
      won: data.won,
      stake: activeTrade.stake,
      payout: data.won ? activeTrade.stake * 1.8 : 0,
      lostAmount: data.won ? 0 : activeTrade.stake,
      entry: activeTrade.entryRate,
      exit: data.exitPrice,
      type: activeTrade.type,
      reason,
    });

    if (data.won) {
      setCelebrate(c => c + 1);
    }

    setActiveTrade(null);
    setPhase("idle");
    setTimerLeft(tradeDur);
  } catch (err) {
    console.error(err);
    showToast("Could not resolve trade.", {
      kind: "error",
    });
  } finally {
    resolveLockRef.current = false;
  }
}, [activeTrade, tradeDur, showToast]);

  // ════ DEPOSIT ════
  const [depAmount, setDepAmount] = useState('500')
  const [depPhone, setDepPhone] = useState(initialUser?.phone || '')
  const [depStatus, setDepStatus] = useState<{ msg: string; kind: ToastKind } | null>(null)
  const [depBusy, setDepBusy] = useState(false)

  const requestSTK = useCallback(async () => {
    const amount = parseFloat(depAmount) || 0
    if (amount < TRADE.MIN_DEPOSIT) { setDepStatus({ msg: `Minimum deposit is KES ${TRADE.MIN_DEPOSIT}`, kind: 'error' }); return }
    if (!/^254\d{9}$/.test(depPhone)) { setDepStatus({ msg: 'Invalid phone format (254XXXXXXXXX)', kind: 'error' }); return }

    setDepBusy(true)
    setDepStatus({ msg: 'Sending STK Push to your phone...', kind: 'warn' })
    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kes: amount, phone: depPhone }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setDepStatus({ msg: data.error || 'Deposit failed', kind: 'error' }); setDepBusy(false); return }

      setDepStatus({ msg: data.message || 'Check your phone for the M-Pesa prompt.', kind: 'success' })

      // Poll the deposit's status until it completes (or we give up).
      let polls = 0
      const depositId = data.depositId
      const poll = setInterval(async () => {
        polls++
        try {
          const sRes = await fetch(`/api/deposit/status?id=${depositId}`)
          const sData = await sRes.json()
          if (sData.status === 'completed') {
            clearInterval(poll)
            const meRes = await fetch('/api/auth/me')
            const meData = await meRes.json()
            if (meData.user) setBalance(Number(meData.user.balance_kes))
            setDepStatus({ msg: 'Deposit confirmed! Balance updated.', kind: 'success' })
            setTimeout(() => setDepositOpen(false), 2000)
          } else if (sData.status === 'failed') {
            clearInterval(poll)
            setDepStatus({ msg: 'Deposit failed or was cancelled.', kind: 'error' })
          }
        } catch { /* keep polling */ }
        if (polls > 20) clearInterval(poll)
      }, 3000)
    } catch {
      setDepStatus({ msg: 'Network error. Try again.', kind: 'error' })
    }
    setDepBusy(false)
  }, [depAmount, depPhone])

  // ════ WITHDRAW ════
  const [wdAmount, setWdAmount] = useState('')
  const [wdStatus, setWdStatus] = useState<{ msg: string; kind: ToastKind } | null>(null)
  const [wdBusy, setWdBusy] = useState(false)

  const submitWithdrawal = useCallback(async () => {
    const amount = parseFloat(wdAmount) || 0
    if (amount < 100) { setWdStatus({ msg: 'Minimum withdrawal is KES 100', kind: 'error' }); return }
    if (amount > balance) { setWdStatus({ msg: 'Amount exceeds your balance', kind: 'error' }); return }

    setWdBusy(true)
    setWdStatus({ msg: 'Submitting request...', kind: 'warn' })
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kes: amount, phone: user?.phone || '' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setWdStatus({ msg: data.error || 'Request failed', kind: 'error' }); setWdBusy(false); return }

      setWithdrawOpen(false)
      showHeroToast(`Withdrawal of KES ${fmt(amount)} submitted`, 'Sent to your registered M-Pesa number', 4000)
      // Refresh balance.
      try {
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meData.user) setBalance(Number(meData.user.balance_kes))
      } catch { /* ignore */ }
    } catch {
      setWdStatus({ msg: 'Network error. Try again.', kind: 'error' })
    }
    setWdBusy(false)
  }, [wdAmount, balance, user, showHeroToast])

  // ════ DERIVED UI VALUES ════
  const ratePct = rate * 100
  const isUp = rate >= 0
  const profit = (() => {
    // void pnlTick // re-evaluates every 100ms via interval
    if (!activeTrade || phase !== 'active') return null
    const stake = activeTrade.stake
    const elapsed =
    tradeClockRef.current
    ? (Date.now() - tradeClockRef.current.start) / 1000
    : 0
    const duration = tradeDur
    const peakTime = Math.min(3, duration * 0.35)
    const seed = activeTrade?.tradeId
    ? Number(activeTrade.tradeId.slice(-3)) || 500
    : 500
    const peak = stake * (5 + (seed / 1000) * 5)
    const landing = stake * (0.10 + (seed / 1000) * 0.15)
    if (elapsed <= peakTime) return peak * Math.min(1, elapsed / peakTime)
    const fallProgress = Math.min(1, (elapsed - peakTime) / Math.max(1, duration - peakTime))
    return peak - (peak - landing) * fallProgress
  })()

  const buyLabel = (() => {
    if (!activeTrade) return { label: 'BUY', sub: '' }
    if (activeTrade.type === 'buy') return { label: 'BUY', sub: `Active · KES ${activeTrade.stake.toFixed(2)}` }
    return cashoutLabel()
  })()
  const sellLabel = (() => {
    if (!activeTrade) return { label: 'SELL', sub: '' }
    if (activeTrade.type === 'sell') return { label: 'SELL', sub: `Active · KES ${activeTrade.stake.toFixed(2)}` }
    return cashoutLabel()
  })()

  function cashoutLabel() {
    if (!activeTrade) return { label: '', sub: '' }
    if (phase === 'resolving') return { label: 'Processing...', sub: '' }
    const rateDiff = rate - activeTrade.entryRate
    const rawPayout = rateDiff > 0 ? activeTrade.stake * (1 + rateDiff) : 0
    const capPayout = activeTrade.stake * TRADE.MAX_MULT
    const livePayout = Math.min(rawPayout, capPayout)
    const eff = livePayout / activeTrade.stake
    const capped = rawPayout > capPayout && rateDiff > 0
    const multStr = rateDiff > 0 ? `×${eff.toFixed(2)}${capped ? ' (max)' : ''}` : '×0.00'
    return { label: 'CASHOUT', sub: `${multStr} · KES ${fmt(livePayout)}` }
  }

  // Which side is the "secondary" (cancel / cashout) button.
  const buyIsSecondary = !!activeTrade && activeTrade.type === 'sell'
  const sellIsSecondary = !!activeTrade && activeTrade.type === 'buy'

  const onTradeBtn = (side: 'buy' | 'sell') => {
    if (!activeTrade) { placeTrade(side); return }
    const isSecondary = side !== activeTrade.type
    if (!isSecondary) return // primary side is locked
    if (phase === 'active') resolveTrade('manual')
  }

  // Timer ring geometry.
  const ringCirc = 2 * Math.PI * 18
  const ringTotal = tradeDur
  const ringValue = phase === 'active' ? timerLeft : tradeDur
  const ringOffset = (1 - ringValue / ringTotal) * ringCirc
  const ringColor = ringValue <= 3 ? '#ff1744' : '#00c853'

  // Autosell HUD.
  const showAutosellHud = !!activeTrade && phase === 'active'

  const btnClass = (side: 'buy' | 'sell') => {
    const isSecondary = side !== activeTrade?.type
    const base = `sk-trade-btn sk-trade-btn-${side}`
    if (!activeTrade) return base
    if (!isSecondary) return `${base} active-trade disabled`
    if (phase === 'prestart') return `${base} active-trade cancel-mode`
    if (phase === 'resolving') return `${base} processing`
    return `${base} active-trade cashout`
  }

  return (
    <div className={`shika-root${isDarkMode ? '' : ' light-mode'}`}>
      {/* ─── HEADER ─── */}
      <header className="sk-header">
        <div className="sk-logo-area">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="sk-logo-icon-img" />
            : <div className="sk-logo-icon">{siteName.slice(0, 1).toUpperCase()}</div>}
          <div className="sk-logo-text">{siteName}</div>
        </div>
        <div className="sk-header-center">
          <div className="sk-header-stat">
            <span className="sk-header-stat-label">24h Volume</span>
            <span className="sk-header-stat-val" style={{ color: 'var(--green)' }}>KES 2.4M</span>
          </div>
          <div className="sk-header-stat">
            <span className="sk-header-stat-label">Traders Online</span>
            <span className="sk-header-stat-val">{onlineCount.toLocaleString()}</span>
          </div>
          <div className="sk-header-stat">
            <span className="sk-header-stat-label">Total Payouts</span>
            <span className="sk-header-stat-val" style={{ color: 'var(--gold)' }}>KES 18.7M</span>
          </div>
        </div>
        <div className="sk-header-right">
          <button className="sk-theme-toggle" onClick={() => setIsDarkMode(d => !d)} aria-label="Toggle theme">
            {isDarkMode ? '☾' : '☀'}
          </button>
          {loggedIn ? (
            <>
              <div className="sk-balance-pill">
                <div className="icon">K</div>
                <div className="val">{fmt(balance)}</div>
              </div>
              <button className="sk-btn-sm sk-btn-green" onClick={() => { setDepStatus(null); setDepositOpen(true) }}>
                +<span className="sk-deposit-label"> Deposit</span>
              </button>
              <button className="sk-btn-sm sk-btn-ghost" onClick={() => { setWdStatus(null); setWdAmount(''); setWithdrawOpen(true) }}>
                ↓<span className="sk-withdraw-label"> Withdraw</span>
              </button>
              <div className="sk-user-menu">
                <button className="sk-btn-sm sk-btn-ghost" onClick={e => { e.stopPropagation(); setUserMenuOpen(o => !o) }}>
                  {user!.username} ▾
                </button>
                <div className={`sk-user-menu-dropdown${userMenuOpen ? ' open' : ''}`}>
                  <a href="/dashboard/profile" className="sk-user-menu-item">Profile</a>
                  <a href="/dashboard/history" className="sk-user-menu-item">Transactions</a>
                  <div className="sk-user-menu-divider" />
                  <button
                    className="sk-user-menu-item sk-user-menu-danger"
                    onClick={async () => {
                      try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
                      window.location.reload()
                    }}
                  >Logout</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button className="sk-btn-sm sk-btn-ghost" onClick={() => { setAuthMode('login'); setAuthOpen(true) }}>Login</button>
              <button className="sk-btn-sm sk-btn-green" onClick={() => { setAuthMode('register'); setAuthOpen(true) }}>Sign Up</button>
            </>
          )}
        </div>
      </header>

      {/* ─── MAIN ─── */}
      <div className="sk-main-layout">
        {/* CHAT */}
        <aside className={`sk-chat-sidebar${mobileChatOpen ? ' mobile-open' : ''}`}>
          <div className="sk-chat-header">
            <div className="sk-live-dot" />
            <span className="sk-chat-header-title">Live Activity</span>
            <span className="sk-online-count">{onlineCount.toLocaleString()} online</span>
            <button
              onClick={() => setMobileChatOpen(false)}
              style={{ display: mobileChatOpen ? 'inline-block' : 'none', marginLeft: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
            >✕</button>
          </div>
          <div className="sk-chat-messages" ref={chatScrollRef}>
            {chat.map(m => (
              <div key={m.id} className={`sk-chat-msg ${m.kind}`} dangerouslySetInnerHTML={{ __html: m.html }} />
            ))}
          </div>
          <div className="sk-chat-input-area">
            <input
              className="sk-chat-input"
              placeholder="Say something..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim()
                  if (v) { addMsg(`<span class="name">You:</span> ${v}`, 'user'); (e.target as HTMLInputElement).value = '' }
                }
              }}
            />
            <button
              className="sk-chat-send-btn"
              onClick={e => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                const v = input.value.trim()
                if (v) { addMsg(`<span class="name">You:</span> ${v}`, 'user'); input.value = '' }
              }}
            >SEND</button>
          </div>
        </aside>

        {/* TRADE CENTER */}
        <div className="sk-trade-center">
          <div className="sk-instrument-bar">
            <div className="sk-rate-display">
              <span className={`sk-rate-val ${isUp ? 'up' : 'down'}`}>{rate.toFixed(4)}</span>
              <span className={`sk-rate-change ${ratePct >= 0 ? 'up' : 'down'}`}>
                {(ratePct >= 0 ? '+' : '') + ratePct.toFixed(2)}%
              </span>
            </div>
            <div className="sk-inst-stats">
              <div className="sk-inst-stat">
                <span className="sk-inst-stat-label">24h High</span>
                <span className="sk-inst-stat-val">{high24.toFixed(4)}</span>
              </div>
              <div className="sk-inst-stat">
                <span className="sk-inst-stat-label">24h Low</span>
                <span className="sk-inst-stat-val">{low24.toFixed(4)}</span>
              </div>
              <div className="sk-inst-stat">
                <span className="sk-inst-stat-label">Spread</span>
                <span className="sk-inst-stat-val">0.0012</span>
              </div>
            </div>
          </div>

          <div className="sk-chart-area">
            <WinningToast siteName={siteName} insideChart />

            <ShikaChart
              prices={prices}
              rate={rate}
              cfg={cfgRef.current}
              entryRate={activeTrade ? activeTrade.entryRate : null}
              isDarkMode={isDarkMode}
            />
            <div className="sk-chart-overlay-tl">
              {[{ s: 30, l: '30s' }, { s: 60, l: '1m' }, { s: 120, l: '2m' }, { s: 300, l: '5m' }].map(tf => (
                <button
                  key={tf.s}
                  className={`sk-tf-btn${tradeDur === tf.s ? ' active' : ''}`}
                  onClick={() => { if (!activeTrade) { setTradeDur(tf.s); setTimerLeft(tf.s) } }}
                >{tf.l}</button>
              ))}
            </div>
            {showAutosellHud && (
              <div className="sk-autosell-hud show">
                <div className="row">
                  <span className="label">Autosell</span>&nbsp;
                  <span className={`val${timerLeft <= 10 ? ' danger' : timerLeft <= 20 ? ' warn' : ''}`}>{timerLeft}s</span>
                </div>
                <div className="row">
                  <span className="label">Target</span>&nbsp;
                  <span className="val">×{TRADE.AUTOSELL_MULT.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* TRADE CONTROLS */}
          <div className="sk-trade-controls">
            <div className="sk-trade-amount-section">
              <span className="sk-trade-label">Stake Amount</span>
              <div className="sk-amount-input-wrap">
                <span className="sk-amount-currency">KES</span>
                <input
                  className="sk-amount-input"
                  type="number"
                  value={stake}
                  min={10}
                  step={10}
                  onChange={e => setStake(e.target.value)}
                />
              </div>
              <div className="sk-quick-amounts">
                {[50, 100, 200, 500].map(v => (
                  <button key={v} className="sk-quick-amt" onClick={() => setStake(String(v))}>{v}</button>
                ))}
              </div>
            </div>
            <div className="sk-timer-section">
              <div className="sk-timer-ring">
                <svg viewBox="0 0 44 44">
                  <circle className="track" cx="22" cy="22" r="18" />
                  <circle
                    className="progress" cx="22" cy="22" r="18"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringOffset}
                    style={{ stroke: ringColor }}
                  />
                </svg>
                <span className="sk-timer-val">{ringValue}</span>
              </div>
              <span className="sk-timer-label">Autosell</span>
              {phase === 'idle' && (
                <div className="sk-duration-picker">
                  {[5, 7, 10, 15].map(s => (
                    <button
                      key={s}
                      className={`sk-dur-btn${tradeDur === s ? ' active' : ''}`}
                      onClick={() => setTradeDur(s)}
                    >{s}s</button>
                  ))}
                </div>
              )}
            </div>
            <div className="sk-trade-buttons">
              <button
                className={btnClass('buy')}
                onClick={() => onTradeBtn('buy')}
              >
                <span className="label">{buyLabel.label}</span>
                {/* {(activeTrade && (buyIsSecondary || buyLabel.sub)) && 
                <span className="sub">{buyLabel.sub} james</span>
                } */}

                
              </button>
              <button
                className={btnClass('sell')}
                onClick={() => onTradeBtn('sell')}
              >
                <span className="label">{sellLabel.label}</span>
                {/* {(activeTrade && (sellIsSecondary || sellLabel.sub)) && <span className="sub">{sellLabel.sub}</span>} */}
              </button>
            </div>
            <div className="sk-profit-bar">
              <span className="sk-profit-label">P&amp;L</span>
              <span className={`sk-profit-val ${profit == null ? 'neutral' : profit > 0 ? 'pos' : 'neg'}`}>
                KES {profit == null ? '0.00' : (profit >= 0 ? '+' : '') + profit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE NAV */}
      <nav className="sk-mobile-nav">
        <div className="sk-mobile-nav-items">
          <button className="sk-mobile-nav-item active">Trade</button>
          <button className="sk-mobile-nav-item" onClick={() => loggedIn ? setDepositOpen(true) : setAuthOpen(true)}>Deposit</button>
          <button className="sk-mobile-nav-item" onClick={() => setMobileChatOpen(o => !o)}>Chats</button>
          <a href="/dashboard/profile" className="sk-mobile-nav-item">Profile</a>
        </div>
      </nav>

      {/* LICENCE STRIP */}
      <div className="sk-licence-strip">
        Licensed in the Commonwealth of The Bahamas · Licence No{' '}
        <span className="licence-no">BHA-0023-1873201</span>
      </div>

      {/* ─── DEPOSIT MODAL ─── */}
      <div className={`sk-modal-overlay${depositOpen ? ' show' : ''}`} onClick={e => { if (e.target === e.currentTarget) setDepositOpen(false) }}>
        <div className="sk-modal-box">
          <div className="sk-modal-title" style={{ color: 'var(--green)' }}>💰 Deposit via M-Pesa</div>
          <label className="sk-modal-input-label">Amount (KES)</label>
          <input className="sk-modal-input" type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="e.g. 500" />
          <label className="sk-modal-input-label">M-Pesa Phone Number</label>
          <input className="sk-modal-input" type="text" value={depPhone} onChange={e => setDepPhone(e.target.value)} placeholder="254712345678" />
          <button className="sk-modal-btn sk-modal-btn-green" disabled={depBusy} onClick={requestSTK}>
            {depBusy ? 'Sending...' : 'Send STK Push'}
          </button>
          <button className="sk-modal-btn sk-modal-btn-ghost" onClick={() => setDepositOpen(false)}>Cancel</button>
          {depStatus && (
            <div className="sk-modal-status" style={{ color: `var(--${depStatus.kind === 'success' ? 'green' : depStatus.kind === 'error' ? 'red' : depStatus.kind === 'warn' ? 'gold' : 'blue'})` }}>
              {depStatus.msg}
            </div>
          )}
        </div>
      </div>

      {/* ─── WITHDRAW MODAL ─── */}
      <div className={`sk-modal-overlay${withdrawOpen ? ' show' : ''}`} onClick={e => { if (e.target === e.currentTarget) setWithdrawOpen(false) }}>
        <div className="sk-modal-box">
          <div className="sk-modal-title" style={{ color: 'var(--gold)' }}>↓ Withdraw to M-Pesa</div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Available: <span style={{ color: 'var(--gold)', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>KES {fmt(balance)}</span>
          </div>
          <label className="sk-modal-input-label">Amount (KES)</label>
          <input className="sk-modal-input" type="number" value={wdAmount} onChange={e => setWdAmount(e.target.value)} placeholder="e.g. 500" />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 2px 10px', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--gold)' }}>ℹ</span> Payment goes to the M-Pesa number registered on your account.
          </div>
          <button className="sk-modal-btn sk-modal-btn-green" disabled={wdBusy} onClick={submitWithdrawal}>
            {wdBusy ? 'Submitting...' : 'Submit Request'}
          </button>
          <button className="sk-modal-btn sk-modal-btn-ghost" onClick={() => setWithdrawOpen(false)}>Cancel</button>
          {wdStatus && (
            <div className="sk-modal-status" style={{ color: `var(--${wdStatus.kind === 'success' ? 'green' : wdStatus.kind === 'error' ? 'red' : wdStatus.kind === 'warn' ? 'gold' : 'blue'})` }}>
              {wdStatus.msg}
            </div>
          )}
        </div>
      </div>

      {/* ─── RESULT MODAL ─── */}
      <div className={`sk-modal-overlay${result ? ' show' : ''}`} onClick={e => { if (e.target === e.currentTarget) setResult(null) }}>
        {result && (
          <div className="sk-modal-box">
            <div className={`sk-result-icon ${result.won ? 'win' : 'lose'}`}>{result.won ? '✓' : '✕'}</div>
            <div className={`sk-result-title ${result.won ? 'win' : 'lose'}`}>
              {result.won
                ? (result.reason === 'autosell' ? 'Autosell Hit!' : 'Congratulations!')
                : result.reason === 'crash' ? 'Rate Crashed'
                : result.reason === 'expired' ? 'Trade Expired' : 'Trade Lost'}
            </div>
            <div className="sk-result-amount" style={{ color: result.won ? '#00c853' : '#ff1744' }}>
              {result.won
                ? `+ KES ${fmt(result.payout)}`
                : `- KES ${fmt(result.lostAmount ?? result.stake)}`}
            </div>
            <div className="sk-result-details">
              {result.won ? (
                <>
                  Type: <span>{result.type.toUpperCase()}</span><br />
                  Multiplier: <span style={{ color: '#ffc107' }}>×{(result.payout / result.stake).toFixed(2)}</span><br />
                  Stake: <span>KES {fmt(result.stake)}</span><br />
                  You won: <span>KES {fmt(result.payout)}</span>
                </>
              ) : (
                <>
                  Type: <span>{result.type.toUpperCase()}</span><br />
                  Stake: <span>KES {fmt(result.stake)}</span><br />
                  Refunded: <span style={{ color: '#ffc107' }}>KES {fmt(result.payout)}</span><br />
                  Lost: <span>KES {fmt(result.lostAmount ?? result.stake)}</span>
                </>
              )}
            </div>
            <button className="sk-modal-btn sk-modal-btn-ghost" onClick={() => setResult(null)}>Continue Trading</button>
          </div>
        )}
      </div>

      {/* ─── TOASTS ─── */}
      <div className="sk-toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`sk-toast toast-${t.kind}`}>
            <span className="toast-icon">{t.kind === 'success' ? '✓' : t.kind === 'info' ? 'i' : t.kind === 'warn' ? '!' : '×'}</span>
            <div className="toast-body">
              <strong>{t.title}</strong>
              {t.sub && <small>{t.sub}</small>}
            </div>
          </div>
        ))}
      </div>

      {/* ─── HERO TOAST ─── */}
      {heroToast && (
        <div className="sk-toast-hero-wrap">
          <div className="sk-toast-hero">
            <div className="hero-check">✓</div>
            <div className="hero-body">
              <div className="hero-title">{heroToast.title}</div>
              {heroToast.sub && <div className="hero-sub" dangerouslySetInnerHTML={{ __html: heroToast.sub }} />}
            </div>
          </div>
        </div>
      )}

      {/* ─── CELEBRATION ─── */}
      {celebrate > 0 && <Celebration key={celebrate} />}

      {/* ─── AUTH MODALS (trading-nova's own) ─── */}
      <AuthModals
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        settings={{ site_name: siteName }}
        onSuccess={(u: any) => {
          setUser({ id: u.id, username: u.username, phone: u.phone, balance_kes: Number(u.balance_kes) })
          setBalance(Number(u.balance_kes))
          setAuthOpen(false)
        }}
      />
    </div>
  )
}

/* ════ CELEBRATION — balloons + confetti, ported from the original ════ */
function Celebration() {
  const balloonColors = ['#ff1744', '#00c853', '#ffc107', '#2979ff', '#ff6d00', '#d500f9', '#00e5ff']
  const confettiColors = ['#ffc107', '#00c853', '#ff1744', '#2979ff', '#ff6d00', '#ffffff']
  const [show, setShow] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setShow(false), 6500)
    return () => clearTimeout(id)
  }, [])
  if (!show) return null

  return (
    <div className="sk-celebration">
      {Array.from({ length: 14 }).map((_, i) => {
        const color = balloonColors[Math.floor(Math.random() * balloonColors.length)]
        return (
          <div
            key={`b${i}`}
            className="sk-balloon"
            style={{
              left: `${3 + Math.random() * 94}%`,
              background: `radial-gradient(circle at 30% 30%, ${color}dd, ${color} 55%, ${color}99 100%)`,
              animationDuration: `${3.5 + Math.random() * 2.5}s`,
              animationDelay: `${Math.random() * 1.2}s`,
              width: `${28 + Math.random() * 16}px`,
              height: `${36 + Math.random() * 18}px`,
              ['--spin' as string]: `${Math.random() * 50 - 25}deg`,
            }}
          />
        )
      })}
      {Array.from({ length: 36 }).map((_, i) => {
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)]
        const ribbon = Math.random() < 0.35
        const dot = !ribbon && Math.random() < 0.5
        return (
          <div
            key={`c${i}`}
            className="sk-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              background: color,
              animationDuration: `${2.2 + Math.random() * 2}s`,
              animationDelay: `${Math.random() * 1.5}s`,
              ...(ribbon ? { width: '3px', height: '18px' } : {}),
              ...(dot ? { borderRadius: '50%', width: '8px', height: '8px' } : {}),
              ['--spin' as string]: `${Math.random() * 720 + 360}deg`,
            }}
          />
        )
      })}
    </div>
  )
}
