'use client'

import { useEffect, useState } from 'react'
import { Gift, Star, Zap, Check, AlertCircle, Tag } from 'lucide-react'
import { fmtKEDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface BonusOffer {
  id: string
  title: string
  description: string
  type: 'welcome' | 'deposit' | 'promo'
  value_percent?: number
  value_usd?: number
  min_deposit_usd?: number
  expires_at?: string | null
  claimed: boolean
}

interface PromoResult {
  success: boolean
  message: string
  bonus_usd?: number
}

export default function BonusPage() {
  const [offers, setOffers] = useState<BonusOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const [settings, setSettings] = useState<{ conversion_rate?: number; site_name?: string }>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/bonus/offers').then(r => r.json()),
      fetch('/api/settings/public').then(r => r.json()).catch(() => ({})),
    ]).then(([d, s]) => {
      setOffers(d.offers || [])
      setSettings(s || {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const rate = Number(settings.conversion_rate ?? 129)

  async function applyPromo() {
    if (!code.trim()) return
    setApplying(true)
    setPromoResult(null)
    try {
      const res = await fetch('/api/bonus/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      setPromoResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Code applied!' : 'Invalid or expired code'),
        bonus_usd: data.bonus_usd,
      })
      if (res.ok) {
        setCode('')
        // Refresh offers to mark redeemed code as claimed
        fetch('/api/bonus/offers').then(r => r.json()).then(d => setOffers(d.offers || []))
      }
    } catch {
      setPromoResult({ success: false, message: 'Something went wrong. Please try again.' })
    } finally {
      setApplying(false)
    }
  }

  const OFFER_ICONS = { welcome: Star, deposit: Zap, promo: Tag }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-white">Bonus Center</h1>
        <p className="text-sm text-gray-400 mt-1">Redeem promo codes and claim your bonuses</p>
      </div>

      {/* Promo code input */}
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="p-5 space-y-3">
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Redeem Promo Code</p>
            <p className="text-xs text-gray-400">Enter a promo code to unlock special rewards</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && applyPromo()}
              placeholder="ENTER CODE HERE"
              className="bg-[#0a0f1c] border-[#374151] text-white placeholder:text-gray-600 font-mono uppercase tracking-widest"
              maxLength={24}
            />
            <Button
              onClick={applyPromo}
              disabled={applying || !code.trim()}
              className="shrink-0 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-10 px-5 disabled:opacity-60"
            >
              {applying ? 'Applying…' : 'Apply'}
            </Button>
          </div>

          {promoResult && (
            <div className={`flex items-start gap-2 text-sm rounded-md px-3 py-2.5 border ${
              promoResult.success
                ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
                : 'bg-red-400/10 border-red-400/20 text-red-400'
            }`}>
              {promoResult.success
                ? <Check className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>
                {promoResult.message}
                {promoResult.bonus_usd != null && (
                  <span className="font-bold">
                    {' '}(+KSh {(promoResult.bonus_usd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offers list */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-white">Available Bonuses</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="bg-[#111827] border-[#1f2937]">
                <CardContent className="p-5 flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl bg-[#1f2937]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 bg-[#1f2937]" />
                    <Skeleton className="h-3 w-64 bg-[#1f2937]" />
                  </div>
                  <Skeleton className="h-8 w-16 bg-[#1f2937]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : offers.length === 0 ? (
          <Card className="bg-[#111827] border-[#1f2937]">
            <CardContent className="p-10 text-center">
              <Gift className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No bonus offers available right now</p>
              <p className="text-gray-500 text-xs mt-1">Check back soon for new promotions</p>
            </CardContent>
          </Card>
        ) : (
          offers.map(offer => {
            const Icon = OFFER_ICONS[offer.type] || Gift
            const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date()

            return (
              <Card
                key={offer.id}
                className={`bg-[#111827] border-[#1f2937] transition-opacity ${offer.claimed || isExpired ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    offer.type === 'welcome' ? 'bg-purple-500/10' :
                    offer.type === 'promo'   ? 'bg-blue-500/10'   : 'bg-[#22c55e]/10'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      offer.type === 'welcome' ? 'text-purple-400' :
                      offer.type === 'promo'   ? 'text-blue-400'   : 'text-[#22c55e]'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{offer.title}</p>
                      {offer.claimed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e]">CLAIMED</span>
                      )}
                      {isExpired && !offer.claimed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400">EXPIRED</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{offer.description}</p>
                    {offer.expires_at && !isExpired && (
                      <p className="text-xs text-yellow-500/80 mt-1">
                        Expires {fmtKEDate(offer.expires_at)}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {offer.value_percent != null && (
                      <p className="text-xl font-black text-[#22c55e]">+{offer.value_percent}%</p>
                    )}
                    {offer.value_usd != null && (
                      <p className="text-xl font-black text-[#22c55e]">
                        KSh {(offer.value_usd * rate).toLocaleString()}
                      </p>
                    )}
                    {/* Promo codes are redeemed via the input above, not a claim button */}
                    {offer.type === 'welcome' && !offer.claimed && !isExpired && (
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[80px] text-right leading-tight">
                        Auto-applied on first deposit
                      </p>
                    )}
                    {offer.type === 'promo' && !offer.claimed && !isExpired && (
                      <button
                        onClick={() => setCode(offer.title.replace('Promo Code: ', ''))}
                        className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 underline"
                      >
                        Use code
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Info banner */}
      <Card className="bg-[#0f1f10] border-[#22c55e]/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Gift className="w-5 h-5 text-[#22c55e] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#22c55e]">Welcome Bonus</p>
            <p className="text-xs text-gray-300 mt-0.5">
              New to {settings.site_name || 'our platform'}? Make your first deposit and receive a bonus on your account. Terms and conditions apply.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
