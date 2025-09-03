import React, { useEffect, useId, useState } from 'react'

export type TooltipProps = {
  children: React.ReactNode
  // Prefer simple text props from Astro pages; falls back to `content` React node
  title?: string
  description?: string
  content?: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
  tooltipClassName?: string
}

/**
 * Lightweight, accessible tooltip.
 * - Opens on hover and focus.
 * - Keyboard-accessible: wrapper is focusable and uses aria-describedby.
 * - No portal; keep layout simple for cards and compact UI.
 */
export default function Tooltip ({
  children,
  title,
  description,
  content,
  placement = 'top-right',
  className,
  tooltipClassName
}: TooltipProps) {
  const id = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [isCoarse, setIsCoarse] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      try {
        setIsCoarse(window.matchMedia('(pointer: coarse)').matches)
      } catch {}
    }
  }, [])

  const pos = (() => {
    switch (placement) {
      case 'top': return 'left-1/2 -translate-x-1/2 bottom-full mb-2'
      case 'top-left': return 'left-0 bottom-full mb-2'
      case 'top-right': return 'right-0 bottom-full mb-2'
      case 'bottom': return 'left-1/2 -translate-x-1/2 top-full mt-2'
      case 'bottom-left': return 'left-0 top-full mt-2'
      case 'bottom-right': return 'right-0 top-full mt-2'
      case 'left': return 'right-full mr-2 top-1/2 -translate-y-1/2'
      case 'right': return 'left-full ml-2 top-1/2 -translate-y-1/2'
      default: return 'right-0 bottom-full mb-2'
    }
  })()

  const arrowPos = (() => {
    switch (placement) {
      case 'top':
      case 'top-left':
      case 'top-right':
        return 'absolute -bottom-1 right-2'
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        return 'absolute -top-1 right-2'
      case 'left':
        return 'absolute right-[-3px] top-1/2 -translate-y-1/2'
      case 'right':
        return 'absolute left-[-3px] top-1/2 -translate-y-1/2'
      default:
        return 'absolute -bottom-1 right-2'
    }
  })()

  return (
    <div
      className={[
        'relative inline-flex group focus:outline-none focus:ring-0',
        className ?? ''
      ].join(' ')}
      tabIndex={0}
      aria-describedby={id}
      onClick={(e) => {
        // On touch devices, toggle tooltip visibility on tap
        if (isCoarse) {
          e.preventDefault()
          setIsOpen(v => !v)
        }
      }}
      onBlur={() => setIsOpen(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false) }}
    >
      {children}
      <div
        id={id}
        role='tooltip'
        className={[
          'pointer-events-none absolute z-50',
          pos,
          'rounded-lg ring-1 ring-neutral-700 bg-neutral-900/95 text-neutral-100',
          'px-2.5 py-2 shadow-xl min-w-[180px]',
          'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0',
          'group-focus-within:opacity-100 group-focus-within:translate-y-0',
          isOpen ? 'opacity-100 translate-y-0' : '',
          'transition motion-reduce:transition-none motion-reduce:transform-none',
          tooltipClassName ?? ''
        ].join(' ')}
      >
        {content ?? (
          <div>
            {title ? <div className='text-[12px] font-semibold leading-snug'>{title}</div> : null}
            {description ? <div className='mt-0.5 text-[11px] text-neutral-300 leading-snug'>{description}</div> : null}
          </div>
        )}
        <div className={[
          arrowPos,
          'w-2 h-2 rotate-45 bg-neutral-900/95 ring-1 ring-neutral-700'
        ].join(' ')} />
      </div>
    </div>
  )
}
