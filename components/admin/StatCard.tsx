import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  change?: number
  changeSub?: string
}

export default function StatCard({
  label, value, icon: Icon,
  iconBg, iconColor,
  change, changeSub = 'vs last week',
}: StatCardProps) {
  const isUp = change !== undefined && change >= 0

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconBg, color: iconColor }}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn('flex items-center gap-1 text-xs font-semibold', isUp ? 'text-emerald-500' : 'text-destructive')}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? '+' : ''}{change.toFixed(1)}%
            </div>
            <span className="text-xs text-muted-foreground">{changeSub}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
