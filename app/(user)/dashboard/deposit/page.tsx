'use client'

import { useEffect, useState, useRef } from 'react'
import { AlertCircle, Loader2, CheckCircle2, XCircle, Gift, Clock } from 'lucide-react'
function isSettingEnabled(value: any) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  )
}
type DepositState = 'idle' | 'pending_stk' | 'completed' | 'failed'

export default function DepositPage() {
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [hasDeposited, setHasDeposited] = useState(false)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [depositState, setDepositState] = useState<DepositState>('idle')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const depositIdRef = useRef<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/settings/public').then(r => r.json()).catch(() => ({})),
      fetch('/api/history?type=deposits&limit=1').then(r => r.json()).catch(() => ({})),
    ]).then(([auth, s, hist]) => {
      if (auth.user) { setUser(auth.user); setPhone(auth.user.phone || '') }
      setSettings(s || {})
      setHasDeposited((hist.deposits?.length ?? 0) > 0)
    })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const rate = settings?.conversion_rate || 129
  const minKes = settings?.min_deposit_kes || 100
  const maxKes = settings?.max_deposit_kes || 10000
  const balanceKes = user ? (Number(user.balance_kes) || 0) : 0

  function startPolling(depositId: string) {
    depositIdRef.current = depositId
    let attempts = 0
    const maxAttempts = 45 // 90 seconds at 2s intervals (STK expires in 60s)

    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/deposit/status?id=${depositId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          stopPolling()
          setDepositState('completed')
          setLoading(false)
          setMessage({ type: 'success', text: `Deposit of KSh ${Number(data.deposit?.amount_kes || 0).toLocaleString()} confirmed!${data.deposit?.bonus_applied ? ' Welcome bonus added!' : ''}` })
          setAmount('')
          refreshUser()
        } else if (data.status === 'failed') {
          stopPolling()
          setDepositState('failed')
          setLoading(false)
          setMessage({ type: 'error', text: 'Payment was cancelled or failed. Please try again.' })
        } else if (attempts >= maxAttempts) {
          stopPolling()
          setDepositState('failed')
          setLoading(false)
          setMessage({ type: 'error', text: 'Payment timed out. If you completed the payment, contact support.' })
        }
      } catch {
        if (attempts >= maxAttempts) {
          stopPolling()
          setDepositState('idle')
          setLoading(false)
        }
      }
    }, 2000)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt < minKes || amt > maxKes) {
      setMessage({ type: 'error', text: `Amount must be between KSh ${minKes} and KSh ${maxKes.toLocaleString()}` })
      return
    }
    if (!phone) {
      setMessage({ type: 'error', text: 'Please enter your M-Pesa phone number' })
      return
    }

    setLoading(true)
    setMessage(null)
    setDepositState('idle')
    stopPolling()

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kes: amt, phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Deposit failed. Try again.' })
        setLoading(false)
        return
      }

      if (data.requiresCallback) {
        // STK push sent — wait for callback
        setDepositState('pending_stk')
        setMessage({ type: 'info', text: 'M-Pesa payment prompt sent to your phone. Enter your PIN to complete.' })
        startPolling(data.depositId)
      } else {
        // Auto-confirmed (M-Pesa not configured)
        setDepositState('completed')
        setLoading(false)
        setMessage({ type: 'success', text: data.message || 'Deposit confirmed!' })
        setAmount('')
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
      setLoading(false)
    }
  }

  function handleCancel() {
    stopPolling()
    setDepositState('idle')
    setLoading(false)
    setMessage(null)
  }

  // Refresh user after deposit so bonus fields appear immediately
  function refreshUser() {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
  }

  const quickAmounts = [100, 250, 500, 1000, 2000, 5000]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="text-gray-400 text-sm mt-1">Top up your trading balance via M-Pesa</p>
      </div>

      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 flex justify-between items-center">
        <div className="text-sm text-gray-400">Available Balance</div>
        <div className="text-xl font-black text-[#22c55e]">
          KSh {balanceKes.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Bonus wallet status */}
      {user && Number(user.bonus_balance_kes) > 0 && (
        <BonusBanner user={user} rate={rate} settings={settings} />
      )}

      {/* Welcome bonus teaser — only for users who have never deposited */}
      {isSettingEnabled(settings?.welcome_bonus_enabled) && !hasDeposited && !Number(user?.bonus_balance_kes) && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-yellow-400 font-bold text-sm">Get {settings.welcome_bonus_percent}% Bonus on Your First Deposit!</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              Deposit KSh {Number(settings.welcome_bonus_min_deposit_kes).toLocaleString()}+ to unlock the Bonus
              {/* · Unlock after {settings.welcome_bonus_trades_required} trades · Valid for {settings.welcome_bonus_expiry_hours}h */}
            </p>
          </div>
        </div>
      )}

      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 max-w-md">
        {/* STK Push waiting state */}
        {depositState === 'pending_stk' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Waiting for Payment</p>
              <p className="text-gray-400 text-sm mt-1">Check your phone for the M-Pesa prompt</p>
              <p className="text-gray-500 text-xs mt-1">Enter your M-Pesa PIN to complete the deposit</p>
            </div>
            <div className="w-full bg-[#0a0f1c] border border-[#1f2937] rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="text-white font-bold">KSh {Number(amount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="text-white">{phone}</span></div>
            </div>
          </div>
        )}

        {/* Completed state */}
        {depositState === 'completed' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Deposit Successful!</p>
              <p className="text-gray-400 text-sm mt-1">{message?.text}</p>
            </div>
            {user && Number(user.bonus_balance_kes) > 0 && (
              <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-left">
                <p className="text-yellow-400 font-bold">🎁 Bonus Credited!</p>
                <p className="text-yellow-400/80 text-xs mt-1">
                  KSh {Number(user.bonus_balance_kes).toLocaleString(undefined, { maximumFractionDigits: 0 })} bonus locked — make {user.bonus_trades_remaining} trades to unlock it.
                </p>
              </div>
            )}
            <button
              onClick={() => { setDepositState('idle'); setMessage(null) }}
              className="w-full h-11 bg-[#22c55e] hover:bg-[#16a34a] text-black font-black rounded-lg transition-colors"
            >
              Make Another Deposit
            </button>
          </div>
        )}

        {/* Failed state */}
        {depositState === 'failed' && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-[#ef4444]" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Payment Failed</p>
              <p className="text-gray-400 text-sm mt-1">{message?.text}</p>
            </div>
            <button
              onClick={() => { setDepositState('idle'); setMessage(null) }}
              className="w-full h-11 bg-[#ef4444] hover:bg-[#dc2626] text-white font-black rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Idle form */}
        {depositState === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                message.type === 'success' ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30' :
                message.type === 'info' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30'
              }`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phone}
                readOnly
                disabled
                placeholder="0712345678"
                className="w-full bg-[#0a0f1c] border border-[#374151] rounded-lg h-10 px-4 text-white text-sm focus:outline-none cursor-not-allowed opacity-70"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Amount (KES)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">KSh</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={String(minKes)}
                  min={minKes}
                  max={maxKes}
                  className="w-full bg-[#0a0f1c] border border-[#374151] rounded-lg h-12 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-[#22c55e] transition-colors"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Min: KSh {Number(minKes).toLocaleString()}</span>
                <span>Max: KSh {Number(maxKes).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={`py-2 rounded-lg text-xs font-bold border transition-colors ${amount === String(v) ? 'bg-[#22c55e] border-[#22c55e] text-black' : 'border-[#374151] text-gray-300 hover:border-[#22c55e] hover:text-[#22c55e]'}`}
                >
                  KSh {v.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-black text-base rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending prompt…</> : 'Deposit via M-Pesa'}
            </button>

            <p className="text-center text-xs text-gray-500">
              You will receive an M-Pesa STK push on your phone
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

function BonusBanner({ user, rate, settings }: { user: any; rate: number; settings: any }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!user.bonus_expires_at) return
    function tick() {
      const diff = new Date(user.bonus_expires_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [user.bonus_expires_at])

  const bonusKes = Number(user.bonus_balance_kes)
  const tradesLeft = Number(user.bonus_trades_remaining)
  const expired = timeLeft === 'Expired'

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/40 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-yellow-400" />
          <div>
            <p className="text-yellow-400 font-bold text-sm">Bonus Wallet</p>
            <p className="text-yellow-400/50 text-[10px]">Locked — complete trades to unlock</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 font-black text-lg">KSh {bonusKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-yellow-400/40 text-[10px]">locked</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-black/20 rounded-lg p-2.5 text-center">
          <p className="text-gray-400 mb-0.5">Trades to Unlock</p>
          <p className={`font-black text-base ${tradesLeft === 0 ? 'text-[#22c55e]' : 'text-white'}`}>
            {tradesLeft === 0 ? '✓ Done!' : tradesLeft}
          </p>
        </div>
        {user.bonus_expires_at ? (
          <div className="bg-black/20 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
              <Clock className="w-3 h-3" /><span>Expires In</span>
            </div>
            <p className={`font-bold text-sm ${expired ? 'text-red-400' : 'text-orange-400'}`}>
              {timeLeft || '…'}
            </p>
          </div>
        ) : (
          <div className="bg-black/20 rounded-lg p-2.5 text-center">
            <p className="text-gray-400 mb-0.5">Expiry</p>
            <p className="text-white font-bold text-sm">No limit</p>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="border-t border-yellow-500/20 pt-3 space-y-1.5 text-xs text-gray-400">
        <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/60 mb-2">How it works</p>
        <div className="flex items-start gap-2">
          <span className="text-yellow-400 shrink-0 mt-0.5">1.</span>
          <span>Your bonus of <span className="text-yellow-400 font-semibold">KSh {bonusKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> is currently <span className="text-white font-semibold">locked</span> — it cannot be withdrawn yet.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-yellow-400 shrink-0 mt-0.5">2.</span>
          <span>Place <span className="text-white font-semibold">{tradesLeft} more trade{tradesLeft !== 1 ? 's' : ''}</span> (any amount) to satisfy the unlock condition.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-yellow-400 shrink-0 mt-0.5">3.</span>
          <span>Once complete, the full bonus is <span className="text-[#22c55e] font-semibold">automatically added to your real balance</span> — ready to trade or withdraw.</span>
        </div>
      </div>

      {tradesLeft === 0 && (
        <div className="flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg p-2.5">
          <span className="text-[#22c55e] text-xs font-semibold">🎉 All trades done! Your bonus unlocks automatically on your next trade.</span>
        </div>
      )}
    </div>
  )
}
