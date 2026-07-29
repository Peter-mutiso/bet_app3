'use client'

import { useEffect, useState, useCallback } from 'react'

const EXPENSE_CATEGORIES = ['Promotion / Ads', 'Airtime / Data', 'Gifts / Giveaways', 'Equipment', 'Other']
// Initial expense is recorded per "round" (1–10); the round number is stored in
// the expense's category column.
const ROUNDS = Array.from({ length: 10 }, (_, i) => `Round ${i + 1}`)

interface LiveSession {
  session: {
    id: string
    title: string
    platform: string
    host: string | null
    started_at: string
  } | null
  totals?: { deposits: number; depositCount: number; expenses: number; net: number }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

// DB returns naive UTC strings (no 'Z'); force UTC so elapsed time is correct.
function parseUTC(value?: string | null): Date | null {
  if (!value) return null
  let s = String(value).trim()
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

// Clock time in Kenyan time (EAT), e.g. "10:43".
function fmtTime(value?: string | null): string {
  const d = parseUTC(value)
  if (!d) return '—'
  return d.toLocaleTimeString('en-KE', {
    timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function fmtDuration(startIso: string, nowMs: number): string {
  const start = parseUTC(startIso)?.getTime() ?? 0
  const ms = Math.max(0, nowMs - start)
  const totalSecs = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(totalSecs / 3600))}:${pad(Math.floor((totalSecs % 3600) / 60))}:${pad(totalSecs % 60)}`
}

export default function MarketingPage() {
  const [data, setData] = useState<{ site_name?: string } | null>(null)

  // Live session state
  const [live, setLive] = useState<LiveSession | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [showStart, setShowStart] = useState(false)
  const [startForm, setStartForm] = useState({
    host_name: '', platform: '',
    expense_category: 'Round 1', expense_amount: '', expense_note: '',
  })
  const [expenseForm, setExpenseForm] = useState({ category: 'Promotion / Ads', amount: '', note: '' })
  // Brief confirmation shown after ending a session (start + stop times).
  const [endedInfo, setEndedInfo] = useState<{ started_at: string; ended_at: string } | null>(null)

  // Only need the site name for the header/footer now.
  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
  }, [])

  const loadSession = useCallback(() => {
    fetch('/api/marketing/session')
      .then(r => r.json())
      .then((d: LiveSession) => setLive(d))
      .catch(() => {})
  }, [])

  // Poll the live session + tick the clock while running.
  useEffect(() => {
    loadSession()
    const clock = setInterval(() => setNow(Date.now()), 1000)
    const poll = setInterval(loadSession, 8000)
    return () => { clearInterval(clock); clearInterval(poll) }
  }, [loadSession])

  async function startSession() {
    if (!startForm.host_name.trim()) { alert('Enter the name of the person running the session'); return }
    const amount = Number(startForm.expense_amount)
    if (!Number.isFinite(amount) || amount <= 0) { alert('Enter the initial expense amount'); return }
    if (!startForm.expense_note.trim()) { alert('Enter a note for the expense'); return }
    setBusy(true)
    const res = await fetch('/api/marketing/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        host_name: startForm.host_name.trim(),
        platform: startForm.platform,
        expense_category: startForm.expense_category,
        expense_amount_kes: amount,
        expense_note: startForm.expense_note.trim(),
      }),
    })
    setBusy(false)
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Could not start session'); return }
    setStartForm({ host_name: '', platform: '', expense_category: 'Round 1', expense_amount: '', expense_note: '' })
    setShowStart(false)
    setEndedInfo(null) // clear the previous ended-session summary
    loadSession()
  }

  async function addExpense() {
    const amount = Number(expenseForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) { alert('Enter an amount greater than 0'); return }
    setBusy(true)
    const res = await fetch('/api/marketing/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_expense', category: expenseForm.category, amount_kes: amount, note: expenseForm.note || undefined }),
    })
    setBusy(false)
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Could not add expense'); return }
    setExpenseForm({ category: 'Promotion / Ads', amount: '', note: '' })
    loadSession()
  }

  async function endSession() {
    if (!confirm('End the current live session?')) return
    setBusy(true)
    const res = await fetch('/api/marketing/session', { method: 'PATCH' })
    setBusy(false)
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Could not end session'); return }
    if (d.started_at && d.ended_at) setEndedInfo({ started_at: d.started_at, ended_at: d.ended_at })
    loadSession()
  }

  const activeSession = live?.session ?? null

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col">

      {/* Ambient glow background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-emerald-700/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="sm:font-extrabold font-bold uppercase sm:text-lg text-white/80">
              {data?.site_name ?? 'Affiliate Portal'}
            </span>
          </div>
          <span className="text-xs text-white/30 font-mono">MARKETER DASHBOARD</span>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-10">

          {/* Live session control */}
          <div className="w-full max-w-2xl">
            {activeSession ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                      </span>
                      <span className="text-rose-400 font-bold uppercase tracking-wide text-sm">Live now</span>
                    </div>
                    <p className="text-white/80 font-semibold">{activeSession.platform ? `${activeSession.platform} · ` : ''}by {activeSession.host || '—'}</p>
                    <p className="text-white/40 text-sm mt-0.5">
                      Started at <span className="font-mono text-white/70">{fmtTime(activeSession.started_at)}</span>
                    </p>
                    <p className="text-white/40 text-sm mt-0.5">
                      Running for <span className="font-mono text-rose-300">{fmtDuration(activeSession.started_at, now)}</span>
                    </p>
                  </div>
                  <button
                    onClick={endSession}
                    disabled={busy}
                    className="px-5 py-2.5 rounded-xl bg-rose-500/90 hover:bg-rose-500 text-white font-semibold text-sm transition disabled:opacity-50"
                  >
                    End session
                  </button>
                </div>

                {/* Live totals */}
                <div className="mt-6">
                  <div className="rounded-xl bg-white/3 border border-white/8 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Expenses</p>
                    <p className="text-lg font-bold text-amber-300 mt-1">KES {fmt(live?.totals?.expenses ?? 0)}</p>
                  </div>
                </div>

                {/* Add expense */}
                <div className="mt-5 pt-5 border-t border-white/8">
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Record an expense</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={expenseForm.category}
                      onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                    >
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0b1220]">{c}</option>)}
                    </select>
                    <input
                      type="number" min={0} inputMode="decimal" placeholder="Amount (KES)"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                      className="sm:w-40 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                    />
                    <button
                      onClick={addExpense}
                      disabled={busy}
                      className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <input
                    placeholder="Note (optional)"
                    value={expenseForm.note}
                    onChange={e => setExpenseForm(f => ({ ...f, note: e.target.value }))}
                    className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {endedInfo && (
                  <div className="rounded-2xl border border-white/8 bg-white/3 p-5 sm:p-6">
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-3">Last session ended</p>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-white/30">Started</p>
                        <p className="font-mono text-white/80">{fmtTime(endedInfo.started_at)}</p>
                      </div>
                      <div className="text-white/20">→</div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-white/30">Ended</p>
                        <p className="font-mono text-white/80">{fmtTime(endedInfo.ended_at)}</p>
                      </div>
                      <div className="ml-auto">
                        <p className="text-[11px] uppercase tracking-wide text-white/30">Duration</p>
                        <p className="font-mono text-white/80">{fmtDuration(endedInfo.started_at, parseUTC(endedInfo.ended_at)?.getTime() ?? Date.now())}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-white/8 bg-white/3 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">Live session</p>
                    <p className="text-white/30 text-xs">No session running. Start one to track deposits and expenses for this live.</p>
                  </div>
                  <button
                    onClick={() => setShowStart(true)}
                    className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 text-sm transition shadow-lg shadow-emerald-500/20"
                  >
                    Start session
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* Cards grid */}
          <div className="w-full max-w-2xl space-y-4">

            {/* Session deposits card — reflects the CURRENT live session only,
                so marketers aren't confused by platform-wide numbers. */}
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">Session Deposits</p>
                  <p className="text-white/30 text-xs">{activeSession ? 'Current live session' : 'No live session'}</p>
                </div>
                {activeSession && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-xs font-medium">Live</span>
                  </div>
                )}
              </div>

              <p className="text-white/25 text-xs">
                {`${activeSession ? (live?.totals?.depositCount ?? 0) : 0} successful M-Pesa transactions`}
              </p>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/15 text-xs">{data?.site_name ?? ''} · Affiliate Programme</span>
          <span className="text-white/15 text-xs font-mono">
            {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </footer>
      </div>

      {/* Start session modal */}
      {showStart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !busy && setShowStart(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 sm:p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">Start a live session</p>
                <p className="text-white/30 text-xs">Only one session can run at a time.</p>
              </div>
              <button
                onClick={() => setShowStart(false)}
                className="text-white/40 hover:text-white transition -mt-1 -mr-1 p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1.5">Person running the session</label>
                <input
                  autoFocus
                  placeholder="e.g. Jane"
                  value={startForm.host_name}
                  onChange={e => setStartForm(f => ({ ...f, host_name: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1.5">Phone number</label>
                <input
                  type="tel" inputMode="tel" placeholder="e.g. 0712345678"
                  value={startForm.platform}
                  onChange={e => setStartForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="rounded-xl border border-white/8 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-white/40">Round</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={startForm.expense_category}
                    onChange={e => setStartForm(f => ({ ...f, expense_category: e.target.value }))}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                  >
                    {ROUNDS.map(r => <option key={r} value={r} className="bg-[#0b1220]">{r}</option>)}
                  </select>
                  <input
                    type="number" min={0} inputMode="decimal" placeholder="Amount (KES)"
                    value={startForm.expense_amount}
                    onChange={e => setStartForm(f => ({ ...f, expense_amount: e.target.value }))}
                    className="sm:w-40 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
                <input
                  placeholder="Note"
                  value={startForm.expense_note}
                  onChange={e => setStartForm(f => ({ ...f, expense_note: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowStart(false)}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-semibold py-3 text-sm transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={startSession}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 text-sm transition disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {busy ? 'Starting…' : 'Start session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
