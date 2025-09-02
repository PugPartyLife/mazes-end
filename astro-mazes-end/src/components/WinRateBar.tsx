import React from 'react'

type WinRateBarProps = {
  label?: string
  percent: number // 0–100
  className?: string
  barColorClass?: string
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const WinRateBar: React.FC<WinRateBarProps> = ({
  label = 'Winrate',
  percent,
  className,
  barColorClass = 'bg-emerald-500'
}) => {
  const pct = Math.round(clamp(percent ?? 0, 0, 100))
  return (
    <div className={['w-full', className ?? ''].join(' ').trim()}>
      <div className='flex items-end justify-between'>
        <span className='text-[11px] uppercase tracking-wide text-neutral-400'>
          {label}
        </span>
        <span className='text-[11px] font-semibold'>{pct}%</span>
      </div>
      <div className='mt-1 h-2 w-full rounded-full bg-neutral-800 overflow-hidden'>
        <div
          className={['h-full rounded-full', barColorClass].join(' ')}
          style={{ width: `${pct}%`, transition: 'width .35s ease' }}
        />
      </div>
    </div>
  )
}

export default WinRateBar

