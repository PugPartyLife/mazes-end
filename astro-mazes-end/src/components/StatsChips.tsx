import React from 'react'
import Tooltip from './Tooltip'

export type StatsChipsProps = {
  staplePercent: number
  decks: number
  top8: number
  direction?: 'vertical' | 'horizontal'
  className?: string
}

export default function StatsChips ({ staplePercent, decks, top8, direction = 'vertical', className }: StatsChipsProps) {
  const wrap = direction === 'vertical'
    ? 'flex flex-col items-end gap-1 '
    : 'grid grid-cols-3 gap-2 '

  return (
    <div className={[wrap, className ?? ''].join(' ')}>
      <Tooltip title='Staple rate' description='Percent of decks that include this card.'>
        <span className='inline-flex items-center gap-1 rounded-md px-2 py-[2px] bg-[#DAA21C] text-neutral-900 font-semibold text-[11px] text-right'>
          {Math.round(staplePercent)}%
        </span>
      </Tooltip>
      <Tooltip title='Decks included' description='Number of unique decks that play this card.'>
        <span className='inline-flex items-center gap-1 rounded-md px-2 py-[2px] bg-emerald-600 text-white font-semibold text-[11px] text-right'>
          {decks}
        </span>
      </Tooltip>
      <Tooltip title='Top 8 finishes' description='Total Top 8 appearances by decks that include this card.'>
        <span className='inline-flex items-center gap-1 rounded-md px-2 py-[2px] bg-sky-600 text-white font-semibold text-[11px] text-right'>
          {top8}
        </span>
      </Tooltip>
    </div>
  )
}
