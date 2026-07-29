'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TrendingUp, LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle,
  BarChart2, Shield, MessageSquare, Newspaper, Gift, Users2,
  HeadphonesIcon, Settings, LogOut, Trophy, Medal, Sparkles, Globe, TrendingDown, Radio,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
} from '@/components/ui/sidebar'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Deposits', href: '/admin/deposits', icon: ArrowDownCircle },
      { label: 'Withdrawals', href: '/admin/withdrawals', icon: ArrowUpCircle },
      { label: 'Failure Analysis', href: '/admin/failure-analysis', icon: TrendingDown },
    ],
  },
  {
    label: 'Trading',
    items: [
      // { label: 'Chart', href: '/admin/chart', icon: LineChart },
      { label: 'Trades', href: '/admin/trades', icon: BarChart2 },
      { label: 'Trading Pairs', href: '/admin/trading-pairs', icon: TrendingUp },
      { label: 'House Edge', href: '/admin/house-edge', icon: Shield },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Referrals', href: '/admin/referrals', icon: Users2 },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Live Sessions', href: '/admin/live-sessions', icon: Radio },
      { label: 'Sites', href: '/admin/sites', icon: Globe },
      { label: 'Live Chat', href: '/admin/live-chat', icon: MessageSquare },
      { label: 'News Ticker', href: '/admin/news-ticker', icon: Newspaper },
      { label: 'Top Traders', href: '/admin/fake-traders', icon: Trophy },
      { label: 'Tournaments', href: '/admin/tournaments', icon: Medal },
      { label: 'Bonuses', href: '/admin/bonuses', icon: Gift },
      { label: 'Winning Toasts', href: '/admin/winning-toast', icon: Sparkles },
      { label: 'Support', href: '/admin/support', icon: HeadphonesIcon },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

async function handleLogout() {
  await fetch('/api/admin/auth/logout', { method: 'POST' })
  window.location.href = '/admin-login'
}

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-16 border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TrendingUp className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold uppercase " >Traders Admin</span>
                <span className="text-[11px] text-muted-foreground">Admin Panel</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase text-[10px] font-bold tracking-widest">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ label, href, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton render={<Link href={href} />} isActive={isActive(href)} tooltip={label}>
                      <Icon />
                      <span className="uppercase text-xs font-semibold tracking-wide">{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                {adminName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span className="font-semibold truncate">{adminName}</span>
                <span className="text-[11px] text-muted-foreground">Administrator</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              tooltip="Sign out"
            >
              <LogOut />
              <span className="uppercase text-xs font-bold tracking-wide">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
