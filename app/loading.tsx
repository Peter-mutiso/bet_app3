'use client'

import { useEffect, useState } from 'react'

export default function Loading() {
  const [siteName, setSiteName] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Fetch site name from public settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(d => setSiteName(d.site_name || null))
      .catch(() => {})
  }, [])

  // Animate progress bar: fast to ~70%, then slow until page is ready
  useEffect(() => {
    let raf: number
    let start: number | null = null

    function step(ts: number) {
      if (!start) start = ts
      const elapsed = ts - start
      // Ease-out curve: fast start, slow finish capped at 92%
      const raw = 1 - Math.exp(-elapsed / 1200)
      setProgress(Math.min(raw * 100, 92))
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Split site name: first word in green, rest in white
  // Single-word names: split roughly in half for visual balance
  const words = siteName ? siteName.trim().split(/\s+/) : null
  let firstWord = ''
  let restWords = ''
  if (words) {
    if (words.length >= 2) {
      firstWord = words[0]
      restWords = words.slice(1).join(' ').toUpperCase()
    } else {
      // Single word: first half green, second half white
      const mid = Math.ceil(words[0].length / 2)
      firstWord = words[0].slice(0, mid)
      restWords = words[0].slice(mid).toUpperCase()
    }
  }

  return (
    <div className="fixed inset-0 bg-[#050d1a] flex flex-col items-center justify-center z-50">
      {/* Logo */}
      <div className="flex items-center gap-1 mb-10 select-none">
        {siteName ? (
          <>
            <span
              className="font-black tracking-tight text-4xl md:text-5xl uppercase"
              style={{ color: '#22c55e' }}
            >
              {firstWord}
            </span>
            {restWords && (
              <>
                {/* Dot separator */}
                <span className="relative flex items-center justify-center w-3 h-3 mx-1">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping"
                    style={{ backgroundColor: '#f97316' }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2.5 w-2.5"
                    style={{ backgroundColor: '#f97316' }}
                  />
                </span>
                <span
                  className="font-black tracking-tight text-4xl md:text-5xl text-white"
                >
                  {restWords.toUpperCase()}
                </span>
              </>
            )}
          </>
        ) : (
          /* Skeleton while site name loads */
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 rounded-md bg-white/10 animate-pulse" />
            <div className="h-10 w-32 rounded-md bg-white/10 animate-pulse" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
            transition: 'width 80ms linear',
          }}
        />
      </div>

      {/* Subtle label */}
      <p className="mt-5 text-xs text-white/20 tracking-widest uppercase font-semibold">
        Loading platform…
      </p>
    </div>
  )
}
