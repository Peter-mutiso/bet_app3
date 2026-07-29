'use client'

import React from 'react'

export default function NewsTicker({ news, speed = 40 }: { news: any[], speed?: number }) {
  if (!news || news.length === 0) return null

  return (
    <div className="flex sm:h-10 h-8 w-full items-center bg-[#111827] border-b border-[#1f2937] overflow-hidden text-sm">
      <div className="flex items-center justify-center h-full bg-[#ef4444] sm:px-4 px-2 font-bold text-white z-10 sm:shrink-0 uppercase sm:tracking-wider sm:text-md text-xs ">
        Global News
      </div>
      <div className="relative flex-1 h-full overflow-hidden flex items-center">
        <div
          className="whitespace-nowrap absolute animate-ticker flex items-center gap-1 text-gray-300"
          style={{ animationDuration: `${speed}s` }}
        >
          {news.map((item, i) => (
            <React.Fragment key={item.id}>
              <span>{item.headline}</span>
              {i < news.length - 1 && <span className="text-gray-600">•</span>}
            </React.Fragment>
          ))}
          {/* Duplicate for seamless looping */}
          <span className="text-gray-600">•</span>
          {news.map((item, i) => (
            <React.Fragment key={`${item.id}-dup`}>
              <span>{item.headline}</span>
              {i < news.length - 1 && <span className="text-gray-600">•</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
