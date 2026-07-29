'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Phone, Shield, UserCheck, Heart, Gift, Clock, Lock, Unlock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [social, setSocial] = useState<{ follows: any[]; likes: any[] }>({ follows: [], likes: [] })
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/trader/my-social').then(r => r.json()),
    ]).then(([auth, s]) => {
      if (auth.user) setUser(auth.user)
      setSocial({ follows: s.follows ?? [], likes: s.likes ?? [] })
    })
  }, [])

  if (!user) return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-[#1f2937]" />
        <Skeleton className="h-4 w-64 bg-[#1f2937]" />
      </div>
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full bg-[#1f2937]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-[#1f2937]" />
            <Skeleton className="h-4 w-24 bg-[#1f2937]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-lg bg-[#1f2937]" />
          <Skeleton className="h-20 rounded-lg bg-[#1f2937]" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg bg-[#1f2937]" />)}
        </div>
      </div>
    </div>
  )

  const rate = 129

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account Profile</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account details and security</p>
      </div>

      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#22c55e] flex items-center justify-center text-black font-black text-2xl">
            {user.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <div className="text-xl font-bold text-white">{user.username}</div>
            <div className="text-sm text-gray-400">{user.phone}</div>
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30">
              {user.account_type === 'vip' ? 'VIP Account' : user.account_type === 'demo' ? 'Demo Account' : 'Standard Account'}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-[#1f2937]">
          <div className="text-center">
            <div className="text-lg font-black text-[#22c55e]">KSh {Number(user.balance_kes ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Balance</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-white capitalize">{user.status === 'active' ? 'Active' : user.status}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Status</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-white">{social.follows.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Following</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-pink-400">{social.likes.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Liked</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[#0a0f1c] rounded-lg border border-[#1f2937]">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">Username</div>
              <div className="text-sm text-white font-medium">{user.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#0a0f1c] rounded-lg border border-[#1f2937]">
            <Phone className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">Phone Number</div>
              <div className="text-sm text-white font-medium">{user.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#0a0f1c] rounded-lg border border-[#1f2937]">
            <Shield className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">Account Type</div>
              <div className="text-sm text-white font-medium capitalize">{user.account_type || 'standard'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bonus wallet card */}
      {Number(user.bonus_balance_kes) > 0 && (
        <BonusCard user={user} rate={rate} />
      )}

      {/* Following list */}
      {social.follows.length > 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#22c55e]" />
            <h2 className="text-sm font-bold text-white">Following ({social.follows.length})</h2>
          </div>
          <div className="space-y-2">
            {social.follows.map(f => (
              <button
                key={f.entry_id}
                onClick={() => router.push(`/dashboard/trader/${f.entry_id}`)}
                className="w-full flex items-center justify-between p-2.5 bg-[#0a0f1c] rounded-lg border border-[#1f2937] hover:border-[#22c55e]/30 transition-colors text-left"
              >
                <span className="text-sm text-white font-medium">{f.trader_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${f.is_bot ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-gray-700 text-gray-300'}`}>
                  {f.is_bot ? 'Pro Trader' : 'Trader'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liked list */}
      {social.likes.length > 0 && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            <h2 className="text-sm font-bold text-white">Liked Traders ({social.likes.length})</h2>
          </div>
          <div className="space-y-2">
            {social.likes.map(l => (
              <button
                key={l.entry_id}
                onClick={() => router.push(`/dashboard/trader/${l.entry_id}`)}
                className="w-full flex items-center justify-between p-2.5 bg-[#0a0f1c] rounded-lg border border-[#1f2937] hover:border-pink-500/30 transition-colors text-left"
              >
                <span className="text-sm text-white font-medium">{l.trader_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${l.is_bot ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-gray-700 text-gray-300'}`}>
                  {l.is_bot ? 'Pro Trader' : 'Trader'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BonusCard({ user, rate }: { user: any; rate: number }) {
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
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/40 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Gift className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-sm">Bonus Wallet</p>
            <p className="text-yellow-400/60 text-[11px]">Assigned bonus — locked until conditions met</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 font-black text-xl">KSh {bonusKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-yellow-400/50 text-[10px]">locked</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-black/20 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Trades to unlock
          </span>
          <span className={`font-black text-base ${tradesLeft === 0 ? 'text-[#22c55e]' : 'text-white'}`}>
            {tradesLeft === 0 ? '✓ Done!' : tradesLeft}
          </span>
        </div>
        {tradesLeft > 0 && (
          <p className="text-[11px] text-gray-500">
            Complete {tradesLeft} more trade{tradesLeft !== 1 ? 's' : ''} and your bonus will be automatically credited to your main balance.
          </p>
        )}
      </div>

      {/* Rules */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bonus Rules</p>
        <div className="space-y-1.5 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
            <span>Bonus funds are <span className="text-white font-semibold">locked</span> and cannot be withdrawn directly.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
            <span>Complete the required trades and the full bonus is <span className="text-[#22c55e] font-semibold">credited to your real balance</span>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
            <span>Any trade counts — there is no minimum stake requirement.</span>
          </div>
          {user.bonus_expires_at && (
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 ${expired ? 'text-red-400' : 'text-yellow-400'}`}>•</span>
              <span>
                Expires in:{' '}
                <span className={`font-semibold ${expired ? 'text-red-400' : 'text-orange-400'}`}>
                  {timeLeft || '…'}
                </span>
                {expired && ' — bonus has expired and will be removed.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unlock indicator */}
      {tradesLeft === 0 && (
        <div className="flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg p-3">
          <Unlock className="w-4 h-4 text-[#22c55e] shrink-0" />
          <p className="text-[#22c55e] text-xs font-semibold">All trades completed! Your bonus will be unlocked automatically on your next trade.</p>
        </div>
      )}
    </div>
  )
}
