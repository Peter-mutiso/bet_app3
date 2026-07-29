'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

interface Site { id: string; name: string; slug: string; domain: string | null }

interface SiteContextValue {
  sites: Site[]
  selectedSiteId: string
  setSelectedSiteId: (id: string) => void
  selectedSite: Site | null
  switching: boolean
}

const SiteContext = createContext<SiteContextValue>({
  sites: [],
  selectedSiteId: '',
  setSelectedSiteId: () => {},
  selectedSite: null,
  switching: false,
})

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [loaded, setLoaded] = useState(false)
  const [switching, setSwitching] = useState(false)
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/admin/sites')
      .then(r => r.json())
      .then(d => {
        const list: Site[] = d.sites || []
        setSites(list)
        const saved = typeof window !== 'undefined' ? localStorage.getItem('admin_site_id') : null
        const valid = saved && list.find(s => s.id === saved)
        setSelectedSiteId(valid ? saved! : '')
        setLoaded(true)
      })
  }, [])

  function handleSetSite(id: string) {
    setSwitching(true)
    setSelectedSiteId(id)
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('admin_site_id', id)
      else localStorage.removeItem('admin_site_id')
    }
    if (switchTimer.current) clearTimeout(switchTimer.current)
    // Clear switching after pages have had time to start their fetches
    switchTimer.current = setTimeout(() => setSwitching(false), 600)
  }

  const selectedSite = sites.find(s => s.id === selectedSiteId) ?? null

  return (
    <SiteContext.Provider value={{ sites, selectedSiteId: loaded ? selectedSiteId : '', setSelectedSiteId: handleSetSite, selectedSite, switching }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  return useContext(SiteContext)
}
