'use client'

import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  'data-state'?: 'checked' | 'unchecked' | 'indeterminate'
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, 'data-state': dataState, 'aria-label': ariaLabel, ...props }, ref) => {
    const isIndeterminate = dataState === 'indeterminate'
    const isChecked = isIndeterminate ? false : (checked ?? false)

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={isIndeterminate ? 'mixed' : isChecked}
        aria-label={ariaLabel}
        onClick={() => onCheckedChange?.(!isChecked)}
        className={cn(
          'h-4 w-4 shrink-0 rounded-sm border border-input bg-background flex items-center justify-center transition-colors',
          (isChecked || isIndeterminate) && 'bg-primary border-primary text-primary-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        {isIndeterminate
          ? <Minus className="h-2.5 w-2.5" strokeWidth={3} />
          : isChecked
            ? <Check className="h-2.5 w-2.5" strokeWidth={3} />
            : null
        }
      </button>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
