'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, User, DollarSign, Send, BarChart2, Users, MessageSquare, Gift, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/dashboard/profile',   label: 'Profile',   icon: User },
  { href: '/dashboard/deposit',   label: 'Deposit',   icon: DollarSign },
  { href: '/dashboard/withdraw',  label: 'Withdraw',  icon: Send },
  { href: '/dashboard/history',   label: 'History',   icon: BarChart2 },
  { href: '/dashboard/referrals', label: 'Referrals', icon: Users },
  { href: '/dashboard/support',   label: 'Support',   icon: MessageSquare },
  { href: '/dashboard/bonus',     label: 'Bonus',     icon: Gift },
]

// Bottom nav shows first 5 most-used items
const bottomNavItems = navItems.slice(0, 5)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [settings, setSettings] = useState<{ site_name?: string; logo_url?: string; whatsapp_community_url?: string } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(d => setSettings(d || {}))
      .catch(() => setSettings({}))
  }, [])

  const siteName = settings?.site_name || ''
  const [first, ...rest] = siteName.split(' ')

  const Logo = () => {
    if (settings === null) return <Skeleton className="h-6 w-28 bg-[#1f2937]" />
    if (settings.logo_url) return <img src={settings.logo_url} alt={siteName} className="h-8 w-auto" />
    return (
      <span className="text-xl font-black tracking-tighter">
        <span className="text-[#22c55e]">{first}</span>
        {rest.length > 0 && <span className="text-white"> {rest.join(' ')}</span>}
      </span>
    )
  }

  return (
    <div className="flex sm:h-[100dvh] w-full bg-[#0a0f1c] text-white overflow-hidden">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 lg:w-64 bg-[#111827] border-r border-[#1f2937] flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-[#1f2937]">
          <Link href="/"><Logo /></Link>
        </div>

        <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}>
                <div className={`flex items-center gap-3 px-5 py-2.5 border-l-2 text-sm transition-colors ${
                  active
                    ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                    : 'border-transparent text-gray-400 hover:bg-[#1f2937] hover:text-white'
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#1f2937] space-y-3">
          {settings?.whatsapp_community_url && (
            <a
              href={settings.whatsapp_community_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 hover:border-[#25D366]/60 rounded-lg px-3 py-2.5 transition-all group"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366] shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#25D366]">WhatsApp Community</div>
                <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Join our channel →</div>
              </div>
            </a>
          )}

          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-1">
            <ChevronLeft className="w-4 h-4" />
            Back to Trading
          </Link>
        </div>
      </aside>

      {/* ── Mobile slide-out drawer ──────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative z-10 w-64 bg-[#111827] border-r border-[#1f2937] flex flex-col h-full">
            <div className="h-14 flex items-center justify-between px-5 border-b border-[#1f2937]">
              <Link href="/" onClick={() => setDrawerOpen(false)}><Logo /></Link>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href} onClick={() => setDrawerOpen(false)}>
                    <div className={`flex items-center gap-3 px-5 py-3 border-l-2 text-sm transition-colors ${
                      active
                        ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                        : 'border-transparent text-gray-400 hover:bg-[#1f2937] hover:text-white'
                    }`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-medium">{label}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-[#1f2937] space-y-3">
              {settings?.whatsapp_community_url && (
                <a
                  href={settings.whatsapp_community_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-lg px-3 py-2.5 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366] shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div>
                    <div className="text-xs font-bold text-[#25D366]">WhatsApp Community</div>
                    <div className="text-[10px] text-gray-500">Join our channel →</div>
                  </div>
                </a>
              )}

              <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-1">
                <ChevronLeft className="w-4 h-4" />
                Back to Trading
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden h-14 shrink-0 flex items-center justify-between px-4 bg-[#111827] border-b border-[#1f2937]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md border border-[#374151] text-gray-400 hover:text-white hover:border-[#22c55e] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo />
          <Link href="/" className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors font-medium">
            <ChevronLeft className="w-3.5 h-3.5" />
            Trading
          </Link>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex h-14 shrink-0 items-center px-6 border-b border-[#1f2937] bg-[#111827]">
          <span className="text-sm font-semibold text-gray-400 capitalize">
            {pathname.split('/').pop()}
          </span>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-3xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111827] border-t border-[#1f2937] flex items-center">
        {bottomNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className="flex-1">
              <div className={`flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-[#22c55e]' : 'text-gray-500 hover:text-gray-300'
              }`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            </Link>
          )
        })}
        {/* More button opens drawer for Referrals, Support, Bonus */}
        <button className="flex-1" onClick={() => setDrawerOpen(true)}>
          <div className="flex flex-col items-center justify-center py-2.5 gap-0.5 text-gray-500 hover:text-gray-300 transition-colors">
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </div>
        </button>
      </nav>
    </div>
  )
}
