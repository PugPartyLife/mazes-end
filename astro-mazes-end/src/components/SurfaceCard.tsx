import React from 'react'

export default function SurfaceCard({
  children,
  className,
  interactive = true,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      className={[
        'rounded-3xl overflow-visible',
        'bg-neutral-900/80 backdrop-blur',
        'ring-1 ring-neutral-700/60',
        'shadow-[0_15px_40px_rgba(0,0,0,.55)]',
        interactive ? 'transition-shadow duration-200 hover:shadow-[0_20px_60px_rgba(0,0,0,.55)] focus-within:ring-neutral-500' : '',
        className ?? ''
      ].join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
