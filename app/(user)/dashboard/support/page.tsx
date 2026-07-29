'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { fmtKEDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Ticket {
  id: string
  subject: string
  category: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  admin_reply?: string
}

const CATEGORIES = [
  { value: 'deposit', label: 'Deposit Issue' },
  { value: 'withdrawal', label: 'Withdrawal Issue' },
  { value: 'account', label: 'Account Issue' },
  { value: 'trading', label: 'Trading Problem' },
  { value: 'bonus', label: 'Bonus & Promotions' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'other', label: 'Other' },
]

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'bg-blue-500/10 text-blue-400',    icon: MessageSquare },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  resolved:    { label: 'Resolved',    color: 'bg-[#22c55e]/10 text-[#22c55e]',  icon: CheckCircle },
  closed:      { label: 'Closed',      color: 'bg-gray-500/10 text-gray-400',    icon: XCircle },
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/support/tickets')
      .then(r => r.json())
      .then(d => {
        setTickets(d.tickets || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !subject.trim() || !message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit ticket')
      setTickets(prev => [data.ticket, ...prev])
      setCategory('')
      setSubject('')
      setMessage('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-white">Support</h1>
        <p className="text-sm text-gray-400 mt-1">Need help? Open a ticket and our team will respond shortly</p>
      </div>

      {/* New ticket form */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5">
          <p className="text-sm font-bold text-white mb-4">Open a New Ticket</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Category</label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="bg-[#0a0f1c] border-[#374151] text-white h-10">
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-[#374151] text-white">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="focus:bg-[#1f2937] focus:text-white">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                maxLength={120}
                className="flex h-10 w-full rounded-md border border-[#374151] bg-[#0a0f1c] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22c55e]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Message</label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue in detail. Include any relevant transaction IDs or amounts."
                className="bg-[#0a0f1c] border-[#374151] text-white placeholder:text-gray-500 min-h-[130px] focus-visible:ring-1 focus-visible:ring-[#22c55e]"
                maxLength={2000}
              />
              <p className="text-right text-xs text-gray-500">{message.length}/2000</p>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-xs text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-md px-3 py-2">
                Ticket submitted successfully! Our team will respond soon.
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-10 px-6 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Ticket history */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5">
          <p className="text-sm font-bold text-white mb-4">My Tickets</p>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map(i => <div key={i} className="h-16 bg-[#1f2937] rounded-lg" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No tickets yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                const StatusIcon = cfg.icon
                const isOpen = expandedId === ticket.id

                return (
                  <div key={ticket.id} className="border border-[#1f2937] rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-[#1f2937]/50 transition-colors text-left"
                      onClick={() => setExpandedId(isOpen ? null : ticket.id)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <StatusIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                            {' · '}
                            {fmtKEDate(ticket.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label.toUpperCase()}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-[#1f2937]">
                        <div className="pt-3">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Your message</p>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.message}</p>
                        </div>
                        {ticket.admin_reply && (
                          <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-md p-3">
                            <p className="text-xs text-[#22c55e] font-semibold uppercase tracking-wider mb-1">Support reply</p>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">{ticket.admin_reply}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
