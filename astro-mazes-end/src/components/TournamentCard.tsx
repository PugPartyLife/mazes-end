import React, { useState } from 'react'
import SurfaceCard from './SurfaceCard'
import MetaRow from './MetaRow'
import DeckBox, { type DeckBoxProps } from './DeckBox'
import { ChevronDown } from 'lucide-react'

export type TournamentCardProps = {
  id: string
  name: string
  startDate?: string | null
  totalPlayers?: number | null
  topCut?: number | null
  decks: DeckBoxProps[]
}

export default function TournamentCard({ id, name, startDate, totalPlayers, topCut, decks }: TournamentCardProps) {
  const [open, setOpen] = useState(false)
  const dateStr = startDate ? new Date(startDate).toLocaleDateString() : ''

  return (
    <div className='w-full tournament-card' id={id}>
      <SurfaceCard className='px-4 py-3 cursor-pointer' onClick={() => setOpen(v => !v)}>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h3 className='text-lg sm:text-xl font-semibold text-neutral-100'>{name}</h3>
            <MetaRow>
              {dateStr ? <span>{dateStr}</span> : null}
              {typeof totalPlayers === 'number' ? <span>Players: {totalPlayers}</span> : null}
              {typeof topCut === 'number' && topCut > 0 ? <span>Top Cut: {topCut}</span> : null}
              <span>Decks: {decks.length}</span>
            </MetaRow>
          </div>
          <div className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronDown size={20} className='text-neutral-300' />
          </div>
        </div>
      </SurfaceCard>

      {open && (
        <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {decks.map((d, i) => (
            <DeckBox key={`${id}-${i}`} {...d} />
          ))}
        </div>
      )}
    </div>
  )
}
