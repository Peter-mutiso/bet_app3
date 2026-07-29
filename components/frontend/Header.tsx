'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet'
import { isCurrencySwitcherEnabled } from '@/lib/currency-settings'
import {
  User, DollarSign, Send, BarChart2, Users, MessageSquare, Gift, LogOut, Menu, X, Trophy, Medal,
} from 'lucide-react'

interface UserType {
  id: string
  username: string
  balance_kes: number
  demo_balance: number
  bonus_balance_kes?: number
  currency_preference?: string
}

interface HeaderProps {
  user: UserType | null
  isDemoMode: boolean
  onLoginClick: () => void
  onRegisterClick: () => void
  onHowToTradeClick: () => void
  onTopTradersClick?: () => void
  onTournamentsClick?: () => void
  settings?: any
  activeCurrency?: string
  toggleCurrency?: () => void
  onLogout?: () => void
}

const navItems = [
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/deposit', label: 'Deposit', icon: DollarSign },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: Send },
  { href: '/dashboard/history', label: 'History', icon: BarChart2 },
  { href: '/dashboard/referrals', label: 'Referrals', icon: Users },
  { href: '/dashboard/support', label: 'Support', icon: MessageSquare },
  { href: '/dashboard/bonus', label: 'Bonus', icon: Gift },
]

export default function Header({
  user, isDemoMode, onLoginClick, onRegisterClick, onHowToTradeClick,
  onTopTradersClick, onTournamentsClick,
  settings, activeCurrency = 'KES', toggleCurrency, onLogout,
}: HeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const symbol = activeCurrency === 'USD' ? '$' : 'KSh'
  const conversionRate = settings?.conversion_rate || 129
  const realBalanceKes = user ? user.balance_kes - Number(user.bonus_balance_kes || 0) : 0
  const balance = user
    ? (isDemoMode ? user.demo_balance * (activeCurrency === 'USD' ? 1 : conversionRate) : (activeCurrency === 'USD' ? realBalanceKes / conversionRate : realBalanceKes))
    : 0

  const siteName: string = settings?.site_name || 'NOVA FOREX'
  const [first, ...rest] = siteName.split(' ')
  const showCurrencySwitcher = isCurrencySwitcherEnabled(settings)

  return (
    <header className="h-14 md:h-16 w-full flex items-center justify-between px-3 md:px-4 bg-[#111827] border-b border-[#1f2937] shrink-0">
      {/* ── Logo + desktop nav (grouped so nav sits right next to logo) ── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={siteName} className="h-7 md:h-8 w-auto" />
          ) : (
            <div className="text-base md:text-xl uppercase font-black tracking-tighter">
              <span className="text-[#22c55e]">{first}</span>
              {rest.length > 0 && <span className="text-white"> {rest.join(' ')}</span>}
            </div>
          )}
          {isDemoMode ? (
            <Badge variant="outline" className="block text-[#22c55e] border-[#22c55e] bg-[#22c55e]/10 uppercase text-[10px]">
              Demo
            </Badge>
          ):
          (
            <Badge variant="outline" className="block text-[#22c55e] border-[#22c55e] bg-[#22c55e]/10 uppercase text-[10px]">
              Real
            </Badge>
          )
          }
        </div>

        <nav className="hidden md:flex items-center gap-1 border-l border-[#1f2937] pl-4">
          <button
            onClick={onTopTradersClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            Top Traders
          </button>
          <button
            onClick={onTournamentsClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
          >
            <Medal className="w-3.5 h-3.5" />
            Tournaments
          </button>
        </nav>
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center py-1 px-2 md:px-3 rounded border border-[#00ff901a] bg-[#142425] gap-1.5 md:gap-3">

        {/* Currency switcher — desktop only */}
        {showCurrencySwitcher && toggleCurrency && (
          <button
            onClick={toggleCurrency}
            className="hidden md:flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-[#374151] hover:border-[#22c55e]"
          >
            <span className="font-bold text-white">{activeCurrency === 'KES' ? '🇰🇪' : '🇺🇸'}</span>
            <span>{activeCurrency}</span>
          </button>
        )}

        {user ? (
          <>
            {/* Username + balance — desktop only */}
            <div className="hidden md:flex items-center gap-1 text-right">
              <div>
                {!isDemoMode && Number(user.bonus_balance_kes) > 0 ? '' : (
                  <div className="text-xs text-gray-400 leading-none mb-0.5">{user.username}</div>
                )}
                <div className="text-sm font-bold text-[#22c55e] leading-none">
                  {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {!isDemoMode && Number(user.bonus_balance_kes) > 0 && (
                  <div className="text-[11px] font-semibold text-amber-400 leading-none mt-0.5">
                    {symbol} {(activeCurrency === 'USD' ? Number(user.bonus_balance_kes) / conversionRate : Number(user.bonus_balance_kes)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bonus
                  </div>
                )}
              </div>
            </div>

            {/* How to Trade */}
            <Button
              variant="ghost"
              size="sm"
              className="text-[#00ff90] bg-[#1a1d23] rounded border border-[#00ff90] hover:bg-[#1f2937] text-xs font-semibold h-8 px-2 md:px-3"
              onClick={onHowToTradeClick}
            >
              <span className="hidden sm:inline">How to</span>
              <span className="sm:hidden">?</span>
            </Button>

            {/* Deposit */}
            <Link href="/dashboard/deposit">
              <Button size="sm" className="text-[#00ff90] bg-[#1a1d23] rounded border border-[#00ff90] hover:bg-[#16a34a] font-bold h-8 px-2 md:px-3 text-xs">
                DEPOSIT
              </Button>
            </Link>

            {/* Withdraw — desktop only */}
            <Link href="/dashboard/withdraw" className="hidden md:block">
              <Button size="sm" variant="outline" className="!text-[#ff4c4c] !bg-[#ff4c4c22] rounded border !border-[#ff4c4c44] hover:bg-[#ff4c4c] hover:border-[#ff4c4c] h-8 px-3 text-xs">
                WITHDRAW
              </Button>
            </Link>

            {/* Hamburger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <button
                onClick={() => setSheetOpen(true)}
                className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-md border border-[#374151] text-gray-400 hover:text-white hover:border-[#22c55e] transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>

              <SheetContent side="right" showCloseButton={false} className="bg-[#111827] border-[#1f2937] text-white !w-[280px] p-0 flex flex-col">
                <SheetHeader className="px-5 py-4 border-b border-[#1f2937] flex-row items-center justify-between">
                  <div>
                    <div className="font-bold text-base text-white">{user.username}</div>
                    <div className="text-sm text-[#22c55e] font-semibold leading-none">
                      {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {!isDemoMode && Number(user.bonus_balance_kes) > 0 && (
                      <div className="text-xs text-amber-400 font-semibold mt-0.5">
                        {symbol} {(activeCurrency === 'USD' ? Number(user.bonus_balance_kes) / conversionRate : Number(user.bonus_balance_kes)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bonus
                      </div>
                    )}
                  </div>
                  <SheetClose
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-[#1f2937] transition-colors"
                    onClick={() => setSheetOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </SheetClose>
                </SheetHeader>

                <nav className="flex-1 py-3 flex flex-col">
                  {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 text-gray-300 hover:bg-[#1f2937] hover:text-[#22c55e] transition-colors group"
                    >
                      <Icon className="w-4 h-4 text-gray-500 group-hover:text-[#22c55e] transition-colors" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  ))}
                </nav>

                <div className="px-5 py-4 border-t border-[#1f2937] space-y-2">
                  {showCurrencySwitcher && toggleCurrency && (
                    <button
                      onClick={() => { toggleCurrency?.(); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-[#374151] text-gray-300 hover:bg-[#1f2937] transition-colors text-sm"
                    >
                      <span>Currency</span>
                      <span className="font-bold text-white">{activeCurrency}</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={() => { setSheetOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          /* ── Logged-out buttons ── */
          <div className="flex items-center gap-1.5 md:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#00ff90] bg-[#1a1d23] rounded border border-[#00ff90] hover:bg-[#1f2937] text-xs font-semibold h-8 px-2 md:px-3"
              onClick={onHowToTradeClick}
            >
              <span className="hidden sm:inline">How to Trade</span>
              <span className="sm:hidden">?</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#374151] text-gray-200 hover:bg-[#1f2937] hover:text-white h-8 px-3 md:px-4 text-xs font-semibold"
              onClick={onLoginClick}
            >
              Login
            </Button>
            <Button
              size="sm"
              className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold h-8 px-3 md:px-4 text-xs"
              onClick={onRegisterClick}
            >
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
