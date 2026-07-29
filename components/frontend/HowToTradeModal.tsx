'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface HowToTradeModalProps {
  isOpen: boolean
  onClose: () => void
  steps: any[]
  settings?: any
}

export default function HowToTradeModal({ isOpen, onClose, steps, settings }: HowToTradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#111827] border-[#1f2937] text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">How To Trade on {settings?.site_name || 'Nova Forex'}</DialogTitle>
          <div className="text-gray-400 text-center text-sm">Master the market in {steps?.length || 5} simple steps and start earning</div>
        </DialogHeader>
        
        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {steps?.map((step: any, index: number) => (
            <div key={index} className="flex gap-4 p-4 rounded-xl bg-[#1f2937] border border-[#374151]">
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full border border-[#22c55e] text-[#22c55e] flex items-center justify-center font-bold">
                  {step.step || index + 1}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">{step.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {/* Basic parsing to highlight BUY/SELL if present */}
                  {step.body.split(/(BUY|SELL)/g).map((part: string, i: number) => {
                    if (part === 'BUY') return <span key={i} className="text-[#22c55e] font-bold">BUY</span>
                    if (part === 'SELL') return <span key={i} className="text-[#ef4444] font-bold">SELL</span>
                    return <span key={i}>{part}</span>
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
