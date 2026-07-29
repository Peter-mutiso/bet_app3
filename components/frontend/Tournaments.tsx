'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trophy, Clock, ChevronRight, X, DollarSign, CheckCircle2, Loader2, UserPlus, UserCheck, Heart, Lock, TrendingUp, BarChart2, Star, ArrowLeft } from 'lucide-react'

interface TournamentEntry {
  id: string
  trader_name: string
  avatar_seed: string
  country_code: string
  result_balance: number
  prize_amount: number
  rank: number
  is_real?: boolean
  user_id?: string | null
}

interface Tournament {
  id: string
  name: string
  description: string
  prize_fund: number
  participation_fee: number
  rebuy_fee: number
  starting_balance: number
  duration_hours: number
  starts_at: string
  ends_at: string
  rules: string
  status: 'active' | 'upcoming' | 'ended'
  tournament_entries: TournamentEntry[]
  joined: boolean
  participant_count: number
}

const FLAG_BASE = 'https://flagcdn.com/16x12'

function Avatar({ seed, name }: { seed: string; name: string }) {
  const initials = (seed || name).slice(0, 2).toUpperCase()
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: color }}>
      {initials}
    </div>
  )
}

function Countdown({ endsAt, startsAt, status }: { endsAt: string; startsAt: string; status: string }) {
  const [parts, setParts] = useState<{ d: number; h: number; m: number; s: number } | null>(null)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    function update() {
      const target = status === 'upcoming' ? new Date(startsAt) : new Date(endsAt)
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setEnded(true); setParts(null); return }
      setEnded(false)
      const totalSec = Math.floor(diff / 1000)
      setParts({
        d: Math.floor(totalSec / 86400),
        h: Math.floor((totalSec % 86400) / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt, startsAt, status])

  if (ended) return <span className="text-gray-400 text-xs">Ended</span>
  if (!parts) return <span>—</span>

  return (
    <div className="flex items-end gap-1">
      {parts.d > 0 && (
        <span className="flex flex-col items-center">
          <span className="font-bold text-white tabular-nums">{parts.d}</span>
          <span className="text-[8px] text-gray-500 uppercase">d</span>
        </span>
      )}
      <span className="flex flex-col items-center">
        <span className="font-bold text-white tabular-nums">{String(parts.h).padStart(2,'0')}</span>
        <span className="text-[8px] text-gray-500 uppercase">h</span>
      </span>
      <span className="text-gray-500 font-bold mb-1.5">:</span>
      <span className="flex flex-col items-center">
        <span className="font-bold text-white tabular-nums">{String(parts.m).padStart(2,'0')}</span>
        <span className="text-[8px] text-gray-500 uppercase">m</span>
      </span>
      <span className="text-gray-500 font-bold mb-1.5">:</span>
      <span className="flex flex-col items-center">
        <span className="font-bold text-[#22c55e] tabular-nums">{String(parts.s).padStart(2,'0')}</span>
        <span className="text-[8px] text-gray-500 uppercase">s</span>
      </span>
    </div>
  )
}

function CountdownCompact({ endsAt, startsAt, status }: { endsAt: string; startsAt: string; status: string }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    function update() {
      const target = status === 'upcoming' ? new Date(startsAt) : new Date(endsAt)
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setLabel('Ended'); return }
      const totalSec = Math.floor(diff / 1000)
      const d = Math.floor(totalSec / 86400)
      const h = Math.floor((totalSec % 86400) / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (d > 0) setLabel(`${d}d ${h}h`)
      else if (h > 0) setLabel(`${h}h ${String(m).padStart(2,'0')}m`)
      else setLabel(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt, startsAt, status])
  return <span>{label}</span>
}

function PrizeRankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span>🥇</span>
  if (rank === 2) return <span>🥈</span>
  if (rank === 3) return <span>🥉</span>
  return <span className="text-xs font-bold text-gray-500">#{rank}</span>
}

function TournamentModal({ t, onClose, onJoined, isLoggedIn, onLoginClick }: { t: Tournament; onClose: () => void; onJoined: (id: string) => void; isLoggedIn: boolean; onLoginClick: () => void }) {
  const [tab, setTab] = useState<'description' | 'rating'>('description')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [traderEntryId, setTraderEntryId] = useState<string | null>(null)
  const sorted = [...t.tournament_entries].sort((a, b) => a.rank - b.rank)

  async function handleJoin() {
    if (joining || t.joined) return
    setError('')

    if (!isLoggedIn) {
      setError('Please log in or create an account to join this tournament.')
      return
    }

    if (t.participation_fee > 0) {
      const ok = window.confirm(
        `Join "${t.name}"?\n\nEntry fee: KSh ${Number(t.participation_fee).toLocaleString()}\nThis will be deducted from your account balance.`
      )
      if (!ok) return
    }

    setJoining(true)
    try {
      const res = await fetch('/api/tournaments/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: t.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to join tournament')
        return
      }
      onJoined(t.id)
    } catch {
      setError('Network error — please try again')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-[#0d1525] border border-[#1f2937] rounded-t-2xl sm:rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#1a2740] to-[#0d1525] p-5 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">{t.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  t.status === 'active' ? 'bg-green-500/20 text-green-400' : t.status === 'ended' ? 'bg-gray-500/20 text-gray-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-green-400' : t.status === 'ended' ? 'bg-gray-400' : 'bg-blue-400'}`} />
                  {t.status === 'active' ? 'Live' : t.status === 'ended' ? 'Ended' : 'Upcoming'}
                </div>
                {t.joined && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#22c55e]/20 text-[#22c55e]">
                    <CheckCircle2 className="w-3 h-3" /> Joined
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prize strip */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 bg-[#0a0f1c] rounded-lg px-3 py-2 text-center">
              <div className="text-amber-400 font-bold text-lg">KSh {Number(t.prize_fund).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Prize Fund</div>
            </div>
            <div className="flex-1 bg-[#0a0f1c] rounded-lg px-3 py-2 text-center">
              <div className="text-white font-bold text-lg">KSh {Number(t.starting_balance).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Start Balance</div>
            </div>
            <div className="flex-1 bg-[#0a0f1c] rounded-lg px-3 py-2 text-center">
              <div className="text-white font-bold text-lg">
                <Countdown endsAt={t.ends_at} startsAt={t.starts_at} status={t.status} />
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                {t.status === 'upcoming' ? 'Starts In' : 'Ends In'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1f2937]">
          {(['description', 'rating'] as const).map(tab_ => (
            <button
              key={tab_}
              onClick={() => setTab(tab_)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === tab_ ? 'text-white border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab_ === 'description' ? 'Description' : 'Rating'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-h-72 overflow-y-auto scrollbar-none">
          {tab === 'description' && (
            <div className="p-4 space-y-3 text-sm">
              {t.description && <p className="text-gray-300 text-xs leading-relaxed">{t.description}</p>}
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Starts', new Date(t.starts_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })],
                  ['Ends', new Date(t.ends_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })],
                  ['Duration', `${t.duration_hours}h`],
                  ['Participants', `${t.participant_count}`],
                  ['Entry Fee', t.participation_fee > 0 ? `KSh ${Number(t.participation_fee).toLocaleString()}` : 'Free'],
                  ['Re-buy Fee', t.rebuy_fee > 0 ? `KSh ${Number(t.rebuy_fee).toLocaleString()}` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#0a0f1c] rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">{k}</div>
                    <div className="text-white text-xs font-semibold mt-0.5">{v}</div>
                  </div>
                ))}
              </div>

              {t.rules && (
                <div className="bg-[#0a0f1c] rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1.5">Rules</p>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{t.rules}</p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 text-center font-medium">{error}</p>
              )}

              {t.status === 'ended' ? (
                <div className="w-full py-2.5 rounded-xl bg-gray-500/10 border border-gray-500/30 flex items-center justify-center gap-2 text-gray-400 text-sm font-medium">
                  This tournament has ended
                </div>
              ) : t.joined ? (
                <div className="w-full py-2.5 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center gap-2 text-[#22c55e] font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  You&apos;re in! Good luck.
                </div>
              ) : !isLoggedIn ? (
                <div className="space-y-2">
                  <div className="w-full py-2.5 rounded-xl bg-[#1f2937] border border-[#374151] text-center text-xs text-gray-400">
                    Login or register to join this tournament
                  </div>
                  <button
                    onClick={() => { onClose(); onLoginClick() }}
                    className="w-full py-2.5 rounded-xl bg-[#22c55e] text-black font-bold text-sm hover:bg-[#16a34a] active:scale-[0.98] transition-all"
                  >
                    Login / Register
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-2.5 rounded-xl bg-[#22c55e] text-black font-bold text-sm hover:bg-[#16a34a] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {joining
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                    : t.participation_fee > 0
                      ? `Join — KSh ${Number(t.participation_fee).toLocaleString()} entry`
                      : 'Join Tournament — Free'
                  }
                </button>
              )}
            </div>
          )}

          {tab === 'rating' && (
            <div className="p-3">
              {/* Winner banner — shown when tournament has ended */}
              {t.status === 'ended' && sorted[0] && (
                <div className="mb-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-400/40 p-3 text-center">
                  <div className="text-lg mb-0.5">🏆</div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">Tournament Winner</div>
                  <div className="text-white font-bold text-sm">{sorted[0].trader_name}</div>
                  <div className="text-amber-400 font-bold text-base mt-1">
                    KSh {Number(sorted[0].prize_amount).toLocaleString()} Prize
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Final balance: KSh {Number(sorted[0].result_balance).toLocaleString()}
                  </div>
                  {t.joined && (
                    <div className="mt-2 text-[10px] text-gray-400">
                      Better luck next time! Watch for upcoming tournaments.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  {t.status === 'ended' ? 'Final Standings' : 'Tournament Chart'}
                </span>
                <span className="text-[10px] text-gray-500">Updated at {new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
              </div>

              {sorted.length === 0 && (
                <p className="text-center text-gray-500 text-xs py-6">No participants yet</p>
              )}

              <div className="space-y-1.5">
                {sorted.map((entry, i) => (
                  <div key={entry.id} className={`flex items-center gap-2 p-2 rounded-lg ${entry.id === 'you' ? 'bg-[#22c55e]/10 border border-[#22c55e]/30' : i < 3 ? 'bg-[#111827] border border-[#1f2937]' : 'bg-[#0a0f1c]'}`}>
                    <div className="w-6 flex items-center justify-center shrink-0">
                      <PrizeRankBadge rank={entry.rank || i + 1} />
                    </div>
                    <Avatar seed={entry.avatar_seed} name={entry.trader_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (!isLoggedIn) { onLoginClick?.(); return }
                            if (entry.id !== 'you') setTraderEntryId(entry.id)
                          }}
                          className={`text-xs font-bold truncate hover:underline transition-colors ${entry.id === 'you' ? 'text-[#22c55e]' : 'text-white hover:text-[#22c55e]'}`}
                        >
                          {entry.trader_name}
                        </button>
                        <img
                          src={`${FLAG_BASE}/${entry.country_code.toLowerCase()}.png`}
                          alt={entry.country_code}
                          className="w-4 h-3 object-cover rounded-sm shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#22c55e]">KSh {Number(entry.result_balance).toLocaleString()}</div>
                      {entry.prize_amount > 0 && (
                        <div className="text-[10px] text-amber-400">KSh {Number(entry.prize_amount).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trader profile modal — opens over the tournament modal */}
      {traderEntryId && (
        <TraderProfileModal entryId={traderEntryId} onClose={() => setTraderEntryId(null)} />
      )}
    </div>
  )
}

function TournamentCard({ t, onClick }: { t: Tournament; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#0d1525] border border-[#1f2937] rounded-xl p-3 hover:border-[#22c55e]/40 hover:bg-[#111827] transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-white text-xs truncate">{t.name}</span>
              {t.joined && (
                <CheckCircle2 className="w-3 h-3 text-[#22c55e] shrink-0" />
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0" />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
              {/* <DollarSign className="w-3 h-3" /> */}
              <div className="">Ksh</div> 
              {Number(t.prize_fund).toLocaleString()} Prize
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />
              <CountdownCompact endsAt={t.ends_at} startsAt={t.starts_at} status={t.status} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-gray-500">
              Entry: {t.participation_fee > 0 ? `KSh ${Number(t.participation_fee).toLocaleString()}` : 'Free'}
            </span>
            {t.joined
              ? <span className="text-[12px] text-gray-300 font-bold">Joined · {t.participant_count} in</span>
              : <span className="text-[12px] text-gray-300 font-bold ">{t.participant_count} participants</span>
            }
          </div>
        </div>
      </div>
    </button>
  )
}

function TraderProfileModal({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const [entry, setEntry] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trader/${entryId}`)
      .then(r => r.json())
      .then(d => { setEntry(d.entry); setLoading(false) })
  }, [entryId])

  async function toggleFollow() {
    setActing(true)
    const res = await fetch('/api/trader/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId }),
    })
    const data = await res.json()
    setEntry((prev: any) => ({ ...prev, i_follow: data.following, follow_count: prev.follow_count + (data.following ? 1 : -1) }))
    setActing(false)
  }

  async function toggleLike() {
    setActing(true)
    const res = await fetch('/api/trader/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId }),
    })
    const data = await res.json()
    setEntry((prev: any) => ({ ...prev, i_liked: data.liked, like_count: prev.like_count + (data.liked ? 1 : -1) }))
    setActing(false)
  }

  const isBot = entry && !entry.is_real

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg bg-[#0d1525] border border-[#1f2937] rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937] sticky top-0 bg-[#0d1525] z-10">
          <span className="text-sm font-bold text-white">Trader Profile</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#1f2937] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && entry && (
          <div className="p-5 space-y-4">
            {/* Avatar + name */}
            <div className="flex items-start gap-3">
              <TraderAvatar seed={entry.avatar_seed} name={entry.trader_name} size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-white truncate">{entry.trader_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isBot ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30' : 'bg-gray-700 text-gray-300'}`}>
                    {isBot ? 'Pro Trader' : 'Trader'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={`https://flagcdn.com/16x12/${(entry.country_code || 'ke').toLowerCase()}.png`} className="w-4 h-3 object-cover rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} alt="" />
                  <span className="text-xs text-gray-400">{entry.country_code || 'KE'}</span>
                </div>
                {entry.tournament_name && (
                  <div className="flex items-center gap-1 mt-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span className="text-[11px] text-amber-400">{entry.tournament_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social counts */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Followers', value: entry.follow_count ?? 0, color: 'text-white' },
                { label: 'Likes', value: entry.like_count ?? 0, color: 'text-pink-400' },
                { label: 'Balance', value: `KSh ${Number(entry.result_balance).toLocaleString()}`, color: 'text-[#22c55e]' },
              ].map(s => (
                <div key={s.label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 text-center">
                  <div className={`text-base font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={toggleFollow}
                disabled={acting}
                className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg font-bold text-sm transition-colors ${entry.i_follow ? 'bg-[#22c55e]/10 border border-[#22c55e]/40 text-[#22c55e]' : 'bg-[#22c55e] text-black hover:bg-[#16a34a]'}`}
              >
                {entry.i_follow ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {entry.i_follow ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={toggleLike}
                disabled={acting}
                className={`flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg font-bold text-sm border transition-colors ${entry.i_liked ? 'bg-pink-500/10 border-pink-500/40 text-pink-400' : 'border-[#1f2937] text-gray-400 hover:border-pink-500/40 hover:text-pink-400'}`}
              >
                <Heart className={`w-4 h-4 ${entry.i_liked ? 'fill-pink-400' : ''}`} />
                {entry.like_count ?? 0}
              </button>
            </div>

            {/* Real user: locked */}
            {!isBot && (
              <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-white font-bold text-sm">Profile Locked</p>
                <p className="text-gray-500 text-xs">This trader has locked their profile.</p>
              </div>
            )}

            {/* Bot: full stats */}
            {isBot && (
              <div className="space-y-3">
                {entry.bot_bio && (
                  <p className="text-gray-400 text-xs leading-relaxed px-1">{entry.bot_bio}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <BarChart2 className="w-4 h-4 text-blue-400" />, label: 'Total Trades', value: Number(entry.bot_total_trades || 0).toLocaleString(), color: 'text-blue-400' },
                    { icon: <TrendingUp className="w-4 h-4 text-[#22c55e]" />, label: 'Win Rate', value: `${entry.bot_win_rate || 0}%`, color: 'text-[#22c55e]' },
                    { icon: <Trophy className="w-4 h-4 text-amber-400" />, label: 'Total Profit', value: `KSh ${Number(entry.bot_total_profit || 0).toLocaleString()}`, color: 'text-amber-400' },
                    { icon: <Star className="w-4 h-4 text-pink-400" />, label: 'Best Trade', value: `KSh ${Number(entry.bot_best_trade || 0).toLocaleString()}`, color: 'text-pink-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">{s.label}</span></div>
                      <div className={`text-base font-black ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TraderAvatar({ seed, name, size = 28 }: { seed: string; name: string; size?: number }) {
  const initials = (seed || name).slice(0, 2).toUpperCase()
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white shrink-0" style={{ background: color, width: size, height: size, fontSize: size * 0.33 }}>
      {initials}
    </div>
  )
}

export default function Tournaments({ onBalanceDeducted, onTournamentsChange, user, onLoginClick }: { onBalanceDeducted?: () => void; onTournamentsChange?: () => void; user?: any; onLoginClick?: () => void } = {}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Tournament | null>(null)

  const isLoggedIn = !!user

  const load = useCallback(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => {
        setTournaments(prev => {
          const next = d.tournaments || []
          // Keep selected tournament in sync with fresh data
          setSelected(sel => {
            if (!sel) return sel
            const updated = next.find((t: Tournament) => t.id === sel.id)
            return updated ?? sel
          })
          return next
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Initial load
  useEffect(() => { load() }, [load])

  // Poll for updates (replaced Supabase realtime on MySQL migration)
  useEffect(() => {
    const id = setInterval(() => load(), 5000)
    return () => clearInterval(id)
  }, [load])

  // Periodic refresh for bots crossing their join_offset_secs threshold (no DB write fires for them)
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  function handleJoined(_tournamentId: string) {
    // Reload from server — user's entry is now saved in DB and visible to everyone
    load()
    setSelected(null)
    onBalanceDeducted?.()
    onTournamentsChange?.()
  }

  const active = tournaments.filter(t => t.status === 'active')
  const upcoming = tournaments.filter(t => t.status === 'upcoming')
  const ended = tournaments.filter(t => t.status === 'ended')

  if (loading) return (
    <div className="flex flex-col h-full bg-[#080d18] p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-[#0d1525] animate-pulse" />
      ))}
    </div>
  )

  if (tournaments.length === 0) return (
    <div className="flex flex-col h-full bg-[#080d18] items-center justify-center p-6">
      <Trophy className="w-10 h-10 text-gray-700 mb-3" />
      <p className="text-gray-500 text-sm font-semibold">No active tournaments</p>
      <p className="text-gray-600 text-xs mt-1">Check back soon</p>
    </div>
  )

  return (
    <>
      <div className="flex flex-col h-full bg-[#080d18] overflow-y-auto scrollbar-none">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">Tournaments</span>
        </div>

        {active.length > 0 && (
          <div className="px-3 mb-1">
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">Active</p>
            <div className="space-y-2">
              {active.map(t => (
                <TournamentCard key={t.id} t={t} onClick={() => setSelected(t)} />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="px-3 mt-3 mb-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Upcoming</p>
            <div className="space-y-2">
              {upcoming.map(t => (
                <TournamentCard key={t.id} t={t} onClick={() => setSelected(t)} />
              ))}
            </div>
          </div>
        )}

        {ended.length > 0 && (
          <div className="px-3 mt-3 mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Results</p>
            <div className="space-y-2">
              {ended.map(t => (
                <TournamentCard key={t.id} t={t} onClick={() => setSelected(t)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <TournamentModal
          t={selected}
          onClose={() => setSelected(null)}
          onJoined={handleJoined}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => { setSelected(null); onLoginClick?.() }}
        />
      )}
    </>
  )
}
