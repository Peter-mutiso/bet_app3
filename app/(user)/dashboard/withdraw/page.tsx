'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { maskPhone } from '@/lib/utils'

export default function WithdrawPage() {
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [successModal, setSuccessModal] = useState<{message: string, amount: string}|null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/settings/public').then(r => r.json()).catch(() => ({})),
    ]).then(([auth, s]) => {
      if (auth.user) {
        setUser(auth.user)
        setPhone(auth.user.phone || '')
      }
      setSettings(s || {})
    })
  }, [])

  const rate = settings?.conversion_rate || 129
  const minKes = settings?.min_withdrawal_kes || 100
  const maxKes = settings?.max_withdrawal_kes || 150000
  const balanceKes = user ? (Number(user.balance_kes) || 0) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt < minKes) {
      setError(`Minimum withdrawal is KSh ${minKes}`)
      return
    }
    if (amt > balanceKes) {
      setError('Insufficient balance')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kes: amt, phone }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessModal({ message: data.message || 'Withdrawal request submitted!', amount: String(amt) })
        setAmount('')
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
      } else {
        setError(data.message || data.error || 'Withdrawal failed.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
        <p className="text-gray-400 text-sm mt-1">Securely withdraw your earnings to M-Pesa</p>
      </div>

      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 flex justify-between items-center">
        <div className="text-sm text-gray-400">Available for Withdrawal</div>
        <div className="text-xl font-black text-white">
          KSh {balanceKes.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">M-Pesa Phone Number</label>
            {/* Registered number — shown masked; the real value is submitted. */}
            <div className="w-full bg-[#0a0f1c] border border-[#374151] rounded-lg h-10 px-4 flex items-center text-white text-sm font-mono tracking-wide">
              {phone ? maskPhone(phone) : '—'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Withdrawal Amount (KES)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">KSh</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={String(minKes)}
                min={minKes}
                max={maxKes}
                className="w-full bg-[#0a0f1c] border border-[#374151] rounded-lg h-12 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-[#ef4444] transition-colors"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Minimum Withdrawal: KSh {minKes}</span>
              <span>Maximum Withdrawal: KSh {maxKes.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-black text-base rounded-lg transition-colors"
          >
            {loading ? 'Processing…' : 'Withdraw'}
          </button>

          <p className="text-center text-xs text-gray-500">
            {settings?.withdrawal_processing_message || 'Funds will be sent to your registered Account Number.'}
          </p>
        </form>
      </div>

      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="flex justify-end">
              <button onClick={() => setSuccessModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Withdrawal Submitted</h2>
              <p className="text-gray-400 text-sm mt-1">KSh {parseFloat(successModal.amount).toLocaleString()}</p>
            </div>
            <p className="text-gray-300 text-sm">{successModal.message}</p>
            <button
              onClick={() => setSuccessModal(null)}
              className="w-full h-11 bg-[#ef4444] hover:bg-[#dc2626] text-white font-black rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
