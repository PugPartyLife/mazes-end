import React from 'react'
import MtgCard from './MtgCard'
import type { DbUICard } from '../types'

/** Shallow “peek” of a real MtgCard (shared by DeckBox/CommanderBox) */
const CommanderPeek: React.FC<{
  card: DbUICard
  width: number
  height: number
  tilt: number
  onOpen?: (c: DbUICard) => void
  className?: string
  maskRatio?: number
}> = ({ card, width, height, tilt, onOpen, className, maskRatio = 0.78 }) => {
  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={`Open ${card?.name ?? 'card'}`}
      onClick={() => onOpen?.(card)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen?.(card)}
      className={`relative ${className ?? ''}`}
      style={{ width, height }}
    >
      <div
        className='absolute inset-0 overflow-hidden rounded-[1rem] shadow-2xl ring-1 ring-black/30 bg-transparent'
        style={{
          transform: `rotate(${tilt}deg)`,
          WebkitMaskImage: `linear-gradient(180deg, #000 ${maskRatio * 100}%, rgba(0,0,0,0) 100%)`,
          maskImage: `linear-gradient(180deg, black ${maskRatio * 100}%, transparent 100%)`
        }}
      >
        <div className='w-full cursor-pointer hover:brightness-130'>
          <MtgCard card={card} />
        </div>
      </div>
    </div>
  )
}

export default CommanderPeek

