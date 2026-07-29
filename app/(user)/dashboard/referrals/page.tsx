'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Users, DollarSign, TrendingUp, Wallet, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { fmtKEDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ReferralStats {
  referral_code: string
  referral_count: number
  total_commission_kes: number
  pending_commission_kes: number
  paid_commission_kes: number
  affiliate_balance_kes: number
}

interface Referral {
  id: string
  display_name: string
  display_phone: string
  created_at: string
  commission_kes: number
  status: 'active' | 'joined'
}

interface AffiliateWithdrawal {
  id: string
  amount_kes: number
  status: 'pending' | 'completed' | 'rejected'
  created_at: string
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Withdraw form
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  const referralUrl = stats
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ref/${stats.referral_code}`
    : ''

  function load() {
    Promise.all([
      fetch('/api/referrals').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings/public').then(r => r.json()).catch(() => ({})),
    ]).then(([ref, s]) => {
      if (ref.stats) setStats(ref.stats)
      if (ref.referrals) setReferrals(ref.referrals)
      if (ref.withdrawals) setWithdrawals(ref.withdrawals)
      setSettings(s || {})
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  function copyLink() {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(withdrawAmt)
    if (!amt || !withdrawPhone) return toast.error('Enter amount and phone number')
    setWithdrawing(true)
    try {
      const res = await fetch('/api/affiliate/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_kes: amt, phone: withdrawPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message || 'Withdrawal is being processed.')
      setWithdrawAmt('')
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setWithdrawing(false)
    }
  }

  const rate = settings.conversion_rate || 129
  const l1 = settings.referral_l1_percent || 15
  const l2 = settings.referral_l2_percent || 10
  const l3 = settings.referral_l3_percent || 5
  const minWithdrawKes = settings.min_referral_withdrawal_kes || 100
  const affiliateBalanceKes = stats?.affiliate_balance_kes ?? 0

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#1f2937] rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-white">Affiliate Program</h1>
        <p className="text-sm text-gray-400 mt-1">
          Earn up to {l1}% commission on every trade your referrals make
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referred', value: String(stats?.referral_count ?? 0), icon: Users, color: 'text-blue-400' },
          {
            label: 'Total Earned',
            value: `KSh ${(stats?.total_commission_kes ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: TrendingUp,
            color: 'text-[#22c55e]',
          },
          {
            label: 'Available',
            value: `KSh ${affiliateBalanceKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: Wallet,
            color: 'text-amber-400',
          },
          {
            label: 'Paid Out',
            value: `KSh ${(stats?.paid_commission_kes ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: 'text-purple-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-[#111827] border-[#1f2937]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <div className="text-base font-bold text-white leading-tight">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral link */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5 space-y-3">
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Your Referral Link</p>
            <p className="text-xs text-gray-400">Share this link and earn commissions automatically on every trade</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={referralUrl || 'Loading…'}
              readOnly
              className="bg-[#0a0f1c] border-[#374151] text-gray-300 text-sm font-mono"
            />
            <Button
              onClick={copyLink}
              className="shrink-0 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-10 px-4"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-1.5 hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
          {/* Commission levels */}
          <div className="flex gap-2 pt-1">
            {[
              { level: 'L1', pct: l1, desc: 'Direct' },
              { level: 'L2', pct: l2, desc: '2nd Level' },
              { level: 'L3', pct: l3, desc: '3rd Level' },
            ].map(({ level, pct, desc }) => (
              <div key={level} className="flex-1 bg-[#0a0f1c] rounded-lg p-2 text-center">
                <div className="text-[#22c55e] font-bold text-sm">{pct}%</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{level} · {desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdraw earnings */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Withdraw Earnings</p>
              <p className="text-xs text-gray-400">Available: <span className="text-[#22c55e] font-semibold">KSh {affiliateBalanceKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> · Min: KSh {Number(minWithdrawKes).toLocaleString()}</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-amber-400" />
          </div>

          <form onSubmit={handleWithdraw} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="number"
              placeholder={`Amount (min KSh ${Number(minWithdrawKes).toLocaleString()})`}
              value={withdrawAmt}
              onChange={e => setWithdrawAmt(e.target.value)}
              className="bg-[#0a0f1c] border-[#374151] text-white"
            />
            <Input
              placeholder="M-Pesa phone e.g. 0712345678"
              value={withdrawPhone}
              onChange={e => setWithdrawPhone(e.target.value)}
              className="bg-[#0a0f1c] border-[#374151] text-white"
            />
            <Button
              type="submit"
              disabled={withdrawing || affiliateBalanceKes < Number(minWithdrawKes)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0"
            >
              {withdrawing ? 'Processing…' : 'Withdraw'}
            </Button>
          </form>

          {/* Withdrawal history */}
          {withdrawals.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Withdrawals</p>
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-[#1f2937] last:border-0">
                  <div className="flex items-center gap-2">
                    {w.status === 'completed'
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                      : w.status === 'rejected'
                        ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                        : <Clock className="w-3.5 h-3.5 text-amber-400" />
                    }
                    <div>
                      <div className="text-xs font-semibold text-white">KSh {Number(w.amount_kes).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500">{fmtKEDate(w.created_at)}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    w.status === 'completed' ? 'bg-[#22c55e]/10 text-[#22c55e]'
                    : w.status === 'rejected' ? 'bg-red-500/10 text-red-400'
                    : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {w.status === 'pending' ? 'Processing' : w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral list */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5">
          <p className="text-sm font-bold text-white mb-4">
            Your Referrals <span className="text-gray-500 font-normal text-xs ml-1">({referrals.length})</span>
          </p>
          {referrals.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No referrals yet</p>
              <p className="text-gray-500 text-xs mt-1">Share your link to start earning</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-[#1f2937]">
                    <th className="text-left pb-2 font-medium">User</th>
                    <th className="text-left pb-2 font-medium">Phone</th>
                    <th className="text-left pb-2 font-medium">Joined</th>
                    <th className="text-right pb-2 font-medium">Earned</th>
                    <th className="text-right pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r.id} className="border-b border-[#1f2937]/50 last:border-0">
                      <td className="py-2.5 text-white font-medium font-mono">{r.display_name}</td>
                      <td className="py-2.5 text-gray-400 font-mono text-xs">{r.display_phone}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{fmtKEDate(r.created_at)}</td>
                      <td className="py-2.5 text-right text-[#22c55e] font-semibold">
                        {r.commission_kes > 0
                          ? `KSh ${r.commission_kes.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : <span className="text-gray-600">—</span>
                        }
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'active'
                            ? 'bg-[#22c55e]/10 text-[#22c55e]'
                            : 'bg-[#1f2937] text-gray-400'
                        }`}>
                          {r.status === 'active' ? 'ACTIVE' : 'JOINED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5">
          <p className="text-sm font-bold text-white mb-4">How It Works</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends via WhatsApp, social media, or SMS' },
              { step: '2', title: 'They sign up & trade', desc: 'Your referral creates an account and starts trading on the platform' },
              { step: '3', title: 'You earn commission', desc: `Earn ${l1}% (L1), ${l2}% (L2), ${l3}% (L3) of every trade made by your network` },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#22c55e]/10 text-[#22c55e] font-black text-sm flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
