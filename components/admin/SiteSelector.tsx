'use client'

import { Globe } from 'lucide-react'
import { useSite } from './SiteContext'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

export default function SiteSelector() {
  const { sites, selectedSiteId, setSelectedSiteId, selectedSite } = useSite()

  if (sites.length === 0) return null

  const label = selectedSite?.name ?? 'All Sites'

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Select value={selectedSiteId || 'all'} onValueChange={v => setSelectedSiteId(v === 'all' ? '' : (v ?? ''))}>
        <SelectTrigger className="h-8 text-xs w-[140px] border-border">
          <span className="truncate">{label}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          {sites.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
