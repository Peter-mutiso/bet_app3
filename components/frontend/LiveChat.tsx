'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { fmtKETime } from '@/lib/utils'

interface ChatMessage {
  id: string
  user_id: string | null
  username: string | null
  message: string
  type: 'user' | 'system_simulated' | 'system_real'
  is_deleted: boolean
  is_pinned: boolean
  created_at: string
}

const MIN_BALANCE_KES = 2000

export default function LiveChat({ user }: { user: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [onlineCount, setOnlineCount] = useState(2341)
  const [restricted, setRestricted] = useState(false)
  const restrictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const listRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const onScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }, [])

  useEffect(() => {
    // Load initial history
    fetch('/api/chat')
      .then(r => r.json())
      .then(d => {
        if (d.messages) {
          setMessages(d.messages)
          setTimeout(() => scrollToBottom(false), 50)
        }
      })

    // SSE stream for real-time updates
    function connect() {
      const es = new EventSource('/api/chat/stream')
      esRef.current = es

      es.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'insert') {
          setMessages(prev => {
            // Deduplicate — ignore if we already have this id
            if (prev.some(m => m.id === data.message.id)) return prev
            const next = [...prev, data.message]
            return next.length > 80 ? next.slice(-80) : next
          })
          if (isAtBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 30)
          }
        }

        if (data.type === 'delete') {
          setMessages(prev => prev.filter(m => m.id !== data.id))
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        // Reconnect after 3s
        setTimeout(connect, 3000)
      }
    }

    connect()

    // Fluctuate online count
    const countInterval = setInterval(() => {
      setOnlineCount(prev => Math.max(1000, prev + Math.floor(Math.random() * 7) - 3))
    }, 8000)

    return () => {
      esRef.current?.close()
      esRef.current = null
      clearInterval(countInterval)
      if (restrictTimerRef.current) clearTimeout(restrictTimerRef.current)
    }
  }, [scrollToBottom])

  const realBalance = (user?.balance_kes || 0) - Number(user?.bonus_balance_kes || 0)
  const isChatRestricted = realBalance < MIN_BALANCE_KES

  const showRestricted = () => {
    setRestricted(true)
    if (restrictTimerRef.current) clearTimeout(restrictTimerRef.current)
    restrictTimerRef.current = setTimeout(() => setRestricted(false), 30000)
  }

  const handleSend = async () => {
    if (!inputText.trim() || !user || sending) return
    if (isChatRestricted) { showRestricted(); return }
    const txt = inputText.trim()
    setInputText('')
    setSending(true)
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt }),
      })
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  const formatTime = (iso: string) => fmtKETime(iso)

  return (
    <div className="w-full h-full bg-[#0a0f1c] flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#111827] border-b border-[#1f2937] flex items-center justify-between shrink-0">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          Live Chat
        </div>
        <div className="text-xs text-gray-500">{onlineCount.toLocaleString()} Online</div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 bg-[#0a0f1c]"
      >
        {messages.map((m) => {
          const isSystem = m.type !== 'user'
          const isMe = user && m.user_id === user.id

          if (isSystem) {
            const isTournament = m.username === '🏆 Tournament'
            return (
              <div key={m.id} className={`flex items-start gap-2 py-1 px-2.5 rounded-lg ${
                isTournament
                  ? 'bg-amber-400/10 border border-amber-400/30'
                  : 'bg-[#22c55e]/8 border border-[#22c55e]/15'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isTournament ? 'bg-amber-400' : 'bg-[#22c55e]'}`} />
                <p className={`text-xs leading-relaxed ${isTournament ? 'text-amber-200 font-semibold' : 'text-gray-300'}`}>{m.message}</p>
              </div>
            )
          }

          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[10px] text-[#3b82f6] font-bold mb-0.5 px-1">{m.username}</span>
              )}
              <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                isMe
                  ? 'bg-[#22c55e] text-black rounded-br-sm font-medium'
                  : 'bg-[#1f2937] text-gray-200 rounded-bl-sm'
              }`}>
                {m.message}
              </div>
              <span className="text-[9px] text-gray-600 mt-0.5 px-1">{formatTime(m.created_at)}</span>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1f2937] bg-[#111827] shrink-0">
        {user && isChatRestricted && restricted && (
          <div className="px-3 py-2 bg-red-900/40 border-b border-red-700/40 flex items-center gap-2">
            <span className="text-red-400 text-[10px] leading-tight">
              Chat access is restricted for traders with a balance below KSh {MIN_BALANCE_KES.toLocaleString()}
            </span>
          </div>
        )}
        <div className="p-2.5 flex items-center gap-2">
          {user ? (
            <>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                onClick={() => isChatRestricted && showRestricted()}
                placeholder={'Say something…'}
                readOnly={isChatRestricted}
                maxLength={300}
                className={`flex-1 bg-[#1f2937] border rounded-full px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none transition-colors ${
                  isChatRestricted
                    ? 'border-red-700/50 cursor-not-allowed opacity-60'
                    : 'border-[#374151] focus:border-[#22c55e]'
                }`}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending || isChatRestricted}
                className="w-8 h-8 rounded-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-black flex items-center justify-center shrink-0 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-500 text-center w-full italic">Login to join the chat</p>
          )}
        </div>
      </div>
    </div>
  )
}
