import React from 'react'

const VARIANTS: Record<string, string> = {
  neutral: 'bg-neutral-600/15 text-neutral-300 ring-1 ring-neutral-500/40',
  success: 'bg-emerald-600/15 text-emerald-300 ring-1 ring-emerald-500/40',
  warn: 'bg-amber-600/15 text-amber-300 ring-1 ring-amber-500/40',
  danger: 'bg-red-600/15 text-red-300 ring-1 ring-red-500/40'
}

export default function Pill({
  children,
  variant = 'neutral',
  className
}: {
  children: React.ReactNode
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  return (
    <span className={['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', VARIANTS[variant], className ?? ''].join(' ')}>
      {children}
    </span>
  )
}

