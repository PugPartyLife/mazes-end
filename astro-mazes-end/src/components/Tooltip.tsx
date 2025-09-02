import React, { useId } from 'react'

export type TooltipProps = {
  children: React.ReactNode
  content: React.ReactNode
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
  content,
  placement = 'top-right',
  className,
  tooltipClassName
}: TooltipProps) {
  const id = useId()

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
    <div className={[
      'relative inline-flex group focus:outline-none focus:ring-0',
      className ?? ''
    ].join(' ')} tabIndex={0} aria-describedby={id}>
      {children}
      <div
        id={id}
        role='tooltip'
        className={[
          'pointer-events-none absolute z-10',
          pos,
          'rounded-lg ring-1 ring-neutral-700 bg-neutral-900/95 text-neutral-100',
          'px-2.5 py-2 shadow-xl min-w-[180px]',
          'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0',
          'group-focus-within:opacity-100 group-focus-within:translate-y-0',
          'transition motion-reduce:transition-none motion-reduce:transform-none',
          tooltipClassName ?? ''
        ].join(' ')}
      >
        {content}
        <div className={[
          arrowPos,
          'w-2 h-2 rotate-45 bg-neutral-900/95 ring-1 ring-neutral-700'
        ].join(' ')} />
      </div>
    </div>
  )
}

