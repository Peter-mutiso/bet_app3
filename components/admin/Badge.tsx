import { Badge as ShadBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const variantMap: Record<string, { variant: BadgeVariant; className?: string }> = {
  active:      { variant: 'default', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
  approved:    { variant: 'default', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
  completed:   { variant: 'default', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
  win:         { variant: 'default', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
  live:        { variant: 'default', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
  pending:     { variant: 'secondary', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
  open:        { variant: 'secondary', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
  in_progress: { variant: 'secondary', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20' },
  processing:  { variant: 'secondary', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20' },
  demo:        { variant: 'secondary', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20' },
  standard:    { variant: 'secondary' },
  vip:         { variant: 'secondary', className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20' },
  failed:      { variant: 'destructive' },
  rejected:    { variant: 'destructive' },
  suspended:   { variant: 'destructive' },
  loss:        { variant: 'destructive' },
  offline:     { variant: 'destructive' },
  cancelled:   { variant: 'outline' },
  closed:      { variant: 'outline' },
}

export default function Badge({ status }: { status: string }) {
  const cfg = variantMap[status?.toLowerCase()] ?? { variant: 'secondary' as BadgeVariant }
  return (
    <ShadBadge variant={cfg.variant} className={cn('capitalize text-xs', cfg.className)}>
      {status?.replace(/_/g, ' ') || '—'}
    </ShadBadge>
  )
}
