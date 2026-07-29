'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import AdminSidebar from './Sidebar'
import Topbar from './Topbar'
import { SiteProvider } from './SiteContext'

export default function AdminShell({ adminName, children }: { adminName: string; children: React.ReactNode }) {
  return (
    <SiteProvider>
      <SidebarProvider>
        <AdminSidebar adminName={adminName} />
        <SidebarInset>
          <Topbar />
          <main className="flex-1 items-center justify-center overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SiteProvider>
  )
}
