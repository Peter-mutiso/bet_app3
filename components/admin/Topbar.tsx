'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from './ThemeToggle'
import SiteSelector from './SiteSelector'

const titles: Record<string, string> = {
  '/admin':               'Dashboard',
  '/admin/users':         'Users',
  '/admin/deposits':      'Deposits',
  '/admin/withdrawals':   'Withdrawals',
  '/admin/trades':        'Trade History',
  '/admin/trading-pairs': 'Trading Pairs',
  '/admin/house-edge':    'House Edge',
  '/admin/live-chat':     'Live Chat',
  '/admin/news-ticker':   'News Ticker',
  '/admin/bonuses':       'Bonuses & Promos',
  '/admin/referrals':     'Referral Settings',
  '/admin/support':       'Support Tickets',
  '/admin/settings':      'Platform Settings',
  '/admin/chart':         'Live Chart',
  '/admin/sites':         'Sites',
}

export default function Topbar() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/').slice(1, 3).join('/')
  const title = titles[base] || 'Admin'

  return (
    <header className="sticky top-0 z-30 flex items-center  gap-2 px-4 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-16" />
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
          System Management
        </p>
        <h1 className="font-semibold text-sm leading-none">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <SiteSelector />
        <ThemeToggle />
        <Button variant="outline" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  )
}
