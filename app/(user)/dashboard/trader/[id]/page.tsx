'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, UserPlus, UserCheck, Lock, Trophy, TrendingUp, BarChart2, Star, ArrowLeft } from 'lucide-react'

function Avatar({ seed, name, size = 20 }: { seed: string; name: string; size?: number }) {
  const initials = (seed || name).slice(0, 2).toUpperCase()
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

export default function TraderProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [entry, setEntry] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/trader/${id}`)
      .then(r => r.json())
      .then(d => { setEntry(d.entry); setLoading(false) })
  }, [id])

  async function toggleFollow() {
    setActing(true)
    const res = await fetch('/api/trader/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: id }),
    })
    const data = await res.json()
    setEntry((prev: any) => ({
      ...prev,
      i_follow: data.following,
      follow_count: prev.follow_count + (data.following ? 1 : -1),
    }))
    setActing(false)
  }

  async function toggleLike() {
    setActing(true)
    const res = await fetch('/api/trader/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: id }),
    })
    const data = await res.json()
    setEntry((prev: any) => ({
      ...prev,
      i_liked: data.liked,
      like_count: prev.like_count + (data.liked ? 1 : -1),
    }))
    setActing(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!entry) return (
    <div className="text-center py-16 text-gray-400">Trader not found.</div>
  )

  const isBot = !entry.is_real

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header card */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5">
        <div className="flex items-start gap-4">
          <Avatar seed={entry.avatar_seed} name={entry.trader_name} size={64} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white truncate">{entry.trader_name}</h1>
              {!isBot && (
                <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Trader</span>
              )}
              {isBot && (
                <span className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Pro Trader</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <img
                src={`https://flagcdn.com/16x12/${(entry.country_code || 'ke').toLowerCase()}.png`}
                className="w-4 h-3 object-cover rounded-sm"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                alt=""
              />
              <span className="text-xs text-gray-400">{entry.country_code || 'KE'}</span>
            </div>
            {entry.tournament_name && (
              <div className="flex items-center gap-1 mt-1.5">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] text-amber-400">{entry.tournament_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Social counts */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-[#1f2937]">
          <div className="text-center">
            <div className="text-base font-black text-white">{entry.follow_count ?? 0}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-base font-black text-white">{entry.like_count ?? 0}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Likes</div>
          </div>
          <div className="text-center">
            <div className="text-base font-black text-[#22c55e]">
              KSh {Number(entry.result_balance).toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Balance</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={toggleFollow}
            disabled={acting}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg font-bold text-sm transition-colors ${
              entry.i_follow
                ? 'bg-[#22c55e]/10 border border-[#22c55e]/40 text-[#22c55e]'
                : 'bg-[#22c55e] text-black hover:bg-[#16a34a]'
            }`}
          >
            {entry.i_follow ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {entry.i_follow ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={toggleLike}
            disabled={acting}
            className={`flex items-center justify-center gap-2 h-10 px-5 rounded-lg font-bold text-sm border transition-colors ${
              entry.i_liked
                ? 'bg-pink-500/10 border-pink-500/40 text-pink-400'
                : 'border-[#1f2937] text-gray-400 hover:border-pink-500/40 hover:text-pink-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${entry.i_liked ? 'fill-pink-400' : ''}`} />
            {entry.like_count ?? 0}
          </button>
        </div>
      </div>

      {/* Real user: locked profile */}
      {!isBot && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
            <Lock className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <p className="text-white font-bold">Profile Locked</p>
            <p className="text-gray-500 text-sm mt-1">This trader has locked their profile.</p>
          </div>
        </div>
      )}

      {/* Bot: full exaggerated stats */}
      {isBot && (
        <div className="space-y-3">
          {entry.bot_bio && (
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
              <p className="text-gray-300 text-sm leading-relaxed">{entry.bot_bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<BarChart2 className="w-4 h-4 text-blue-400" />}
              label="Total Trades"
              value={Number(entry.bot_total_trades || 0).toLocaleString()}
              color="text-blue-400"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-[#22c55e]" />}
              label="Win Rate"
              value={`${entry.bot_win_rate || 0}%`}
              color="text-[#22c55e]"
            />
            <StatCard
              icon={<Trophy className="w-4 h-4 text-amber-400" />}
              label="Total Profit"
              value={`KSh ${Number(entry.bot_total_profit || 0).toLocaleString()}`}
              color="text-amber-400"
            />
            <StatCard
              icon={<Star className="w-4 h-4 text-pink-400" />}
              label="Best Trade"
              value={`KSh ${Number(entry.bot_best_trade || 0).toLocaleString()}`}
              color="text-pink-400"
            />
          </div>

          {/* Tournament performance */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Tournament Performance</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Balance</span>
                <span className="text-[#22c55e] font-bold">KSh {Number(entry.result_balance).toLocaleString()}</span>
              </div>
              {entry.prize_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Prize Won</span>
                  <span className="text-amber-400 font-bold">KSh {Number(entry.prize_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tournament</span>
                <span className="text-white">{entry.tournament_name}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
    </div>
  )
}
