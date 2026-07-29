'use client'

interface Pair {
  id: string
  symbol: string
  display_name: string
  payout_multiplier?: number
}

interface Props {
  pairs: Pair[]
  selectedPairId: string
  onSelect: (id: string) => void
  settings?: any
}

export default function PairTicker({ pairs, selectedPairId, onSelect, settings }: Props) {
  if (pairs.length <= 1) return null

  return (
    <div className="flex overflow-x-auto border-b border-[#1f2937] bg-[#080d18] shrink-0 scrollbar-none">
      {pairs.map(p => {
        const payout = p.payout_multiplier || settings?.payout_multiplier || 1.8
        const payoutPct = Math.round((payout - 1) * 100)
        const isSelected = p.id === selectedPairId

        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`relative px-4 py-2 shrink-0 border-r border-[#1f2937] transition-colors ${
              isSelected ? 'bg-[#0d1525]' : 'hover:bg-[#0d1525]/60'
            }`}
          >
            {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
            <div className="text-xs font-bold text-white whitespace-nowrap">
              {p.display_name || p.symbol}
            </div>
            <div className="text-[10px] font-bold text-[#22c55e] mt-0.5">
              +{payoutPct}%
            </div>
          </button>
        )
      })}
    </div>
  )
}
